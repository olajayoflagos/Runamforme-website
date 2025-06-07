import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  limit,
  orderBy,
  startAfter,
  type DocumentData,
  documentId,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ShareModal from '../components/ShareModal';
import { formatUserProfile, formatErrand, createNotification, checkErrandLimit } from '../firebase/firestore';
import { Container, Row, Col, Card, Nav, Tab, Button, Alert, Spinner } from 'react-bootstrap';
import type { UserProfile, Errand, Review, ErrandHistory } from '../types';
import UsersErrandFeed from '../components/UsersErrandFeed';
const UserEngagementStats = React.lazy(() => import('../components/UserEngagementStats'));
const UserProfileActions = React.lazy(() => import('../components/UserProfileActions'));
const UserProfileHeader = React.lazy(() => import('../components/UserProfileHeader'));
const FollowersFollowingList = React.lazy(() => import('../components/FollowersFollowingList'));

const TAB_OPTIONS = ['posted', 'completed', 'liked', 'bookmarked', 'followers', 'following', 'reviews', 'history', 'settings'] as const;
const USER_LIST_TABS = ['followers', 'following'];

type ProfileData = {
  profile: UserProfile | null;
  errands: Errand[];
  completedErrands: Errand[];
  likedErrands: Errand[];
  bookmarkedErrands: Errand[];
  followersErrands: Errand[];
  followingErrands: Errand[];
  reviews: Review[];
  errandHistory: ErrandHistory[];
  followers: UserProfile[];
  following: UserProfile[];
  lastErrandDoc: DocumentData | null;
  lastCompletedErrandDoc: DocumentData | null;
  lastLikedErrandDoc: DocumentData | null;
  lastBookmarkedErrandDoc: DocumentData | null;
  lastFollowersErrandDoc: DocumentData | null;
  lastFollowingErrandDoc: DocumentData | null;
};

const UserProfilePage: React.FC = () => {
  const { id: usernameFromUrl } = useParams<{ id: string }>();
  const { currentUser, authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<ProfileData>({
    profile: null,
    errands: [],
    completedErrands: [],
    likedErrands: [],
    bookmarkedErrands: [],
    followersErrands: [],
    followingErrands: [],
    reviews: [],
    errandHistory: [],
    followers: [],
    following: [],
    lastErrandDoc: null,
    lastCompletedErrandDoc: null,
    lastLikedErrandDoc: null,
    lastBookmarkedErrandDoc: null,
    lastFollowersErrandDoc: null,
    lastFollowingErrandDoc: null,
  });
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const initialTabFromUrl = new URLSearchParams(location.search).get('tab') as typeof TAB_OPTIONS[number] | null;
  const initialViewFromUrl = new URLSearchParams(location.search).get('view') === 'users';
  const [tab, setTab] = useState<typeof TAB_OPTIONS[number]>(
    initialTabFromUrl && TAB_OPTIONS.includes(initialTabFromUrl) ? initialTabFromUrl : 'posted'
  );
  const [showUsersInTab, setShowUsersInTab] = useState(USER_LIST_TABS.includes(tab) && initialViewFromUrl);
  const [showShareModal, setShowShareModal] = useState(false);
  const PAGE_SIZE = 10;

  const redirectWithError = useCallback((path: string, message: string) => {
    setError(message);
    navigate(path, { replace: true });
  }, [navigate]);

  const handleFollowToggle = useCallback(async () => {
    if (!currentUser) {
      redirectWithError('/login', 'Please sign in to follow users.');
      return;
    }
    if (currentUser.isAnonymous) {
      redirectWithError('/register', 'Anonymous users cannot follow others. Please sign up.');
      return;
    }
    if (!profileData.profile || currentUser.uid === profileData.profile.uid) return;
    if (profileData.profile.blockedUsers?.includes(currentUser.uid)) {
      setError('You cannot follow this user.');
      return;
    }
    if (profileData.profile.privacySettings?.profileVisibility === 'private' && !profileData.profile.followers.includes(currentUser.uid)) {
      setError('This profile is private.');
      return;
    }

    const limitError = await checkErrandLimit(currentUser.uid);
    if (limitError) {
      setError(limitError);
      return;
    }

    setFollowLoading(true);
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const profileRef = doc(db, 'users', profileData.profile.uid);
        const isFollowing = profileData.profile.followers.includes(currentUser.uid);

        await Promise.all([
          updateDoc(currentUserRef, {
            following: isFollowing ? arrayRemove(profileData.profile.uid) : arrayUnion(profileData.profile.uid),
            followingCount: increment(isFollowing ? -1 : 1),
          }),
          updateDoc(profileRef, {
            followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
            followersCount: increment(isFollowing ? -1 : 1),
          }),
        ]);

        if (!isFollowing) {
          await createNotification(
            profileData.profile.uid,
            'follow',
            currentUser.uid,
            `@${currentUser.displayName || 'A user'} followed you.`
          );
        }

        setProfileData(prev => ({
          ...prev,
          profile: prev.profile
            ? {
                ...prev.profile,
                followers: isFollowing
                  ? prev.profile.followers.filter(uid => uid !== currentUser.uid)
                  : [...prev.profile.followers, currentUser.uid],
                followersCount: prev.profile.followersCount + (isFollowing ? -1 : 1),
              }
            : null,
        }));
        setFollowLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt === maxRetries) {
          console.error('Error toggling follow status after retries:', err);
          setError('Failed to update follow status. Please try again later.');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    setFollowLoading(false);
  }, [currentUser, profileData.profile, redirectWithError]);

  const fetchUserErrands = useCallback(
    async (userId: string, status: string[] | string, lastDoc: DocumentData | null, key: keyof ProfileData) => {
      try {
        let q = query(
          collection(db, 'errands'),
          where('userId', '==', userId),
          where(status === 'completed' ? 'status' : 'status', status === 'completed' ? '==' : 'in', status),
          where('isArchived', '==', false),
          orderBy(status === 'completed' ? 'completedAt' : 'createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
        if (lastDoc) q = query(q, startAfter(lastDoc));
        const snapshot = await getDocs(q);
        const errands = snapshot.docs.map(formatErrand);
        setProfileData(prev => ({
          ...prev,
          [key]: [...(Array.isArray(prev[key]) ? prev[key] : []), ...errands] as Errand[],
          [`last${key.charAt(0).toUpperCase() + key.slice(1)}Doc`]: snapshot.docs[snapshot.docs.length - 1] || null,
        }));
        return snapshot.docs.length === PAGE_SIZE;
      } catch (err) {
        console.error(`Error fetching ${key}:`, err);
        setError(`Failed to load ${key}. Please try again.`);
        return false;
      }
    },
    []
  );

  const fetchNetworkErrands = useCallback(
    async (userIds: string[], lastDoc: DocumentData | null, key: keyof ProfileData) => {
      if (!userIds.length) return false;
      try {
        const batchSize = 10;
        const userIdBatches = [];
        for (let i = 0; i < userIds.length; i += batchSize) {
          userIdBatches.push(userIds.slice(i, i + batchSize));
        }
        let errands: Errand[] = [];
        for (const batch of userIdBatches) {
          let q = query(
            collection(db, 'errands'),
            where('userId', 'in', batch),
            where('isArchived', '==', false),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          );
          if (lastDoc && key === 'followingErrands') q = query(q, startAfter(lastDoc));
          const snapshot = await getDocs(q);
          errands = [...errands, ...snapshot.docs.map(formatErrand)];
        }
        setProfileData(prev => ({
          ...prev,
          [key]: [...(Array.isArray(prev[key]) ? prev[key] : []), ...errands] as Errand[],
          [`last${key.charAt(0).toUpperCase() + key.slice(1)}Doc`]: errands.length > 0 ? { id: errands[errands.length - 1].id } : null,
        }));
        return errands.length === PAGE_SIZE;
      } catch (err) {
        console.error(`Error fetching ${key}:`, err);
        setError(`Failed to load ${key}. Please try again.`);
        return false;
      }
    },
    []
  );

  const batchFetchUsersByIds = useCallback(async (userIds: string[]): Promise<UserProfile[]> => {
    if (!userIds.length) return [];
    const batches = [];
    for (let i = 0; i < userIds.length; i += 10) {
      batches.push(userIds.slice(i, i + 10));
    }
    const users: UserProfile[] = [];
    for (const batch of batches) {
      try {
        if (batch.length > 0) {
          const q = query(collection(db, 'users'), where(documentId(), 'in', batch));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            users.push(formatUserProfile(doc));
          });
        }
      } catch (err) {
        console.error('Error fetching user batch:', err);
      }
    }
    return users;
  }, []);

  const fetchProfileAndData = useCallback(
    async (username: string) => {
      if (!username) {
        redirectWithError('/404', 'Username not provided.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setProfileData({
          profile: null,
          errands: [],
          completedErrands: [],
          likedErrands: [],
          bookmarkedErrands: [],
          followersErrands: [],
          followingErrands: [],
          reviews: [],
          errandHistory: [],
          followers: [],
          following: [],
          lastErrandDoc: null,
          lastCompletedErrandDoc: null,
          lastLikedErrandDoc: null,
          lastBookmarkedErrandDoc: null,
          lastFollowersErrandDoc: null,
          lastFollowingErrandDoc: null,
        });

        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('searchableUsername', '==', username.toLowerCase()), limit(1));
        const userQuerySnapshot = await getDocs(userQuery);

        if (userQuerySnapshot.empty) {
          redirectWithError('/404', `User "@${username}" not found.`);
          return;
        }

        const userDoc = userQuerySnapshot.docs[0];
        const userId = userDoc.id;
        const profileDataNew = formatUserProfile(userDoc);
        setProfileData(prev => ({ ...prev, profile: profileDataNew }));

        const [reviewsData, historyData, followersData, followingData] = await Promise.all([
          getDocs(query(collection(db, 'reviews'), where('reviewedId', '==', userId), orderBy('createdAt', 'desc'), limit(50))).then(
            snapshot => snapshot.docs.map(doc => ({
              id: doc.id,
              errandId: doc.data().errandId || '',
              reviewerId: doc.data().reviewerId || '',
              reviewedId: doc.data().reviewedId || '',
              rating: doc.data().rating || 0,
              comment: doc.data().comment || '',
              createdAt: doc.data().createdAt && 'toDate' in doc.data().createdAt ? doc.data().createdAt.toDate() : null,
            } as Review))
          ),
          getDocs(query(collection(db, 'errandHistory'), where('userId', '==', userId), orderBy('completedAt', 'desc'), limit(50))).then(
            snapshot => snapshot.docs.map(doc => ({
              id: doc.id,
              errandId: doc.data().errandId || '',
              userId: doc.data().userId || '',
              runnerUid: doc.data().runnerUid || '',
              title: doc.data().title || 'Untitled Errand',
              completedAt: doc.data().completedAt && 'toDate' in doc.data().completedAt ? doc.data().completedAt.toDate() : null,
              cancelledAt: doc.data().cancelledAt && 'toDate' in doc.data().cancelledAt ? doc.data().cancelledAt.toDate() : null,
            } as ErrandHistory))
          ),
          batchFetchUsersByIds(profileDataNew.followers || []),
          batchFetchUsersByIds(profileDataNew.following || []),
        ]);

        setProfileData(prev => ({ ...prev, reviews: reviewsData, errandHistory: historyData, followers: followersData, following: followingData }));

        await Promise.all([
          fetchUserErrands(userId, ['open', 'pending'], null, 'errands'),
          fetchUserErrands(userId, 'completed', null, 'completedErrands'),
          Array.isArray(profileDataNew.likes) && profileDataNew.likes.length > 0

            ? fetchUserErrands(userId, profileDataNew.likes, null, 'likedErrands')
            : Promise.resolve(),
          profileDataNew.bookmarks?.length
            ? fetchUserErrands(userId, profileDataNew.bookmarks, null, 'bookmarkedErrands')
            : Promise.resolve(),
          profileDataNew.followers?.length
            ? fetchNetworkErrands(profileDataNew.followers, null, 'followersErrands')
            : Promise.resolve(),
          profileDataNew.following?.length
            ? fetchNetworkErrands(profileDataNew.following, null, 'followingErrands')
            : Promise.resolve(),
        ]);
      } catch (err) {
        console.error('Error fetching profile and data:', err);
        redirectWithError('/profile', 'Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [currentUser, redirectWithError, fetchUserErrands, fetchNetworkErrands, batchFetchUsersByIds]
  );

  type LastDocKey =
    | 'lastErrandDoc'
    | 'lastCompletedErrandDoc'
    | 'lastLikedErrandDoc'
    | 'lastBookmarkedErrandDoc'
    | 'lastFollowersErrandDoc'
    | 'lastFollowingErrandDoc';

  const getLastDocKey = (tabKey: keyof ProfileData): LastDocKey => {
    switch (tabKey) {
      case 'errands':
        return 'lastErrandDoc';
      case 'completedErrands':
        return 'lastCompletedErrandDoc';
      case 'likedErrands':
        return 'lastLikedErrandDoc';
      case 'bookmarkedErrands':
        return 'lastBookmarkedErrandDoc';
      case 'followersErrands':
        return 'lastFollowersErrandDoc';
      case 'followingErrands':
        return 'lastFollowingErrandDoc';
      default:
        throw new Error('Invalid tabKey');
    }
  };

  const handleLoadMore = useCallback(
    async (tabKey: keyof ProfileData) => {
      if (!profileData.profile) return;
      setTabLoading(true);
      try {
        if (['errands', 'completedErrands', 'likedErrands', 'bookmarkedErrands'].includes(tabKey)) {
          
        } else if (['followersErrands', 'followingErrands'].includes(tabKey)) {
          const lastDocKey = getLastDocKey(tabKey);
          const userIds = tabKey === 'followersErrands' ? profileData.profile.followers : profileData.profile.following;
          await fetchNetworkErrands(userIds, profileData[lastDocKey], tabKey);
        }
      } catch (err) {
        console.error('Error loading more:', err);
        setError('Failed to load more data. Please try again.');
      } finally {
        setTabLoading(false);
      }
    },
    [profileData, fetchUserErrands, fetchNetworkErrands]
  );

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!authLoading && usernameFromUrl) {
      fetchProfileAndData(usernameFromUrl);
    } else if (!usernameFromUrl) {
      redirectWithError('/profile', 'No username specified in URL.');
    }
  }, [usernameFromUrl, authLoading, fetchProfileAndData, redirectWithError]);

  if (authLoading || loading) {
    return (
      <Container className="my-5 text-center" aria-live="polite">
        <Spinner animation="border" variant="primary" role="status" aria-label={authLoading ? 'Loading authentication state' : 'Loading profile data'} />
        <p className="mt-2 text-muted">{authLoading ? 'Loading authentication state...' : 'Loading profile data...'}</p>
      </Container>
    );
  }

  if (!profileData.profile && !loading && !error) {
    return (
      <Container className="my-5 text-center">
        <p className="text-muted">No profile data available</p>
        <Button variant="primary" onClick={() => navigate('/')} aria-label="Go back to home page">
          Go Home
        </Button>
      </Container>
    );
  }

  const shareUrl = profileData.profile
    ? `${window.location.origin}/profile/${profileData.profile.username}`
    : window.location.href;

  const isOwnProfile = currentUser?.uid === profileData.profile?.uid;

  return (
    <Container className="my-4 my-md-5">
      <Suspense fallback={<div className="text-center py-5" aria-live="polite">Loading profile section...</div>}>
        {error && (
          <Alert variant="danger" className="d-flex align-items-center" role="alert" dismissible onClose={handleDismissError}>
            <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
            <div>
              {error}
              <Button variant="outline-primary" size="sm" className="ms-2" onClick={() => navigate('/')} aria-label="Go back to home page">
                Go Home
              </Button>
            </div>
          </Alert>
        )}

        <Card className="shadow-sm mb-4" aria-labelledby="profile-header">
          <Card.Body>
            <UserProfileHeader
              avatarUrl={profileData.profile?.avatarUrl || '/default-avatar.png'}
              email={profileData.profile?.email || ''}
              name={profileData.profile?.name || 'Unnamed User'}
              username={profileData.profile?.username || 'unknown_user'}
              bio={profileData.profile?.bio || ''}
              userType={profileData.profile?.userType || 'both'}
              createdAt={profileData.profile?.createdAt || null}
              hasBluetick={profileData.profile?.hasBluetick || false}
              isVerified={profileData.profile?.isVerified || false}
              walletBalance={isOwnProfile ? profileData.profile?.walletBalance || 0 : 0}
            />
          </Card.Body>
          <Card.Footer className="bg-transparent">
            <Row className="align-items-center">
              <Col xs={12} md={8} className="mb-3 mb-md-0">
                <UserEngagementStats
                  uid={profileData.profile?.uid || ''}
                  followersCount={profileData.profile?.followersCount || 0}
                  followingCount={profileData.profile?.followingCount || 0}
                  likes={profileData.profile?.likes || 0}
                  ratings={profileData.profile?.ratings || 0}
                  reviewCount={profileData.profile?.reviewCount || 0}
                  walletBalance={isOwnProfile ? profileData.profile?.virtualBalance || 0 : 0}
                />
              </Col>
              <Col xs={12} md={4} className="text-md-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="me-2"
                  onClick={() => setShowShareModal(true)}
                  aria-label="Share profile"
                >
                  📤 Share Profile
                </Button>
                <UserProfileActions
                  isOwnProfile={isOwnProfile}
                  isFollowing={currentUser ? !!profileData.profile?.followers.includes(currentUser.uid) : false}
                  handleFollowToggle={handleFollowToggle}
                  userId={profileData.profile?.uid || ''}
                  username={profileData.profile?.username || ''}
                  followActionLoading={followLoading}
                />
              </Col>
            </Row>
          </Card.Footer>
        </Card>

        <Nav variant="tabs" className="mb-4 flex-nowrap overflow-auto" role="tablist">
          {TAB_OPTIONS.map((tabId) => (
            <Nav.Item key={tabId}>
              <Nav.Link
                active={tab === tabId}
                onClick={() => {
                  setTab(tabId);
                  const showUsers = USER_LIST_TABS.includes(tabId);
                  setShowUsersInTab(showUsers);
                  navigate(`?tab=${tabId}${showUsers ? '&view=users' : ''}`, { replace: true });
                }}
                aria-selected={tab === tabId}
                className="text-capitalize"
              >
                {tabId}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <Tab.Content>
          {['posted', 'completed', 'liked', 'bookmarked'].map(tabKey => (
            <Tab.Pane key={tabKey} eventKey={tabKey} active={tab === tabKey}>
              {tabLoading ? (
                <div className="text-center py-3">
                  <Spinner animation="border" variant="primary" role="status" aria-label="Loading errands" />
                </div>
              ) : (
                <UsersErrandFeed errands={profileData[`${tabKey}Errands` as keyof ProfileData] as Errand[]} />
              )}
              {profileData[`last${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}Doc` as LastDocKey] && (
                <div className="text-center mt-3">
                  <Button
                    variant="outline-primary"
                    onClick={() => handleLoadMore(`${tabKey}Errands` as keyof ProfileData)}
                    disabled={tabLoading}
                    aria-label={`Load more ${tabKey} errands`}
                  >
                    {tabLoading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </Tab.Pane>
          ))}
          {['followers', 'following'].map(tabKey => (
            <Tab.Pane key={tabKey} eventKey={tabKey} active={tab === tabKey}>
              {showUsersInTab ? (
                <Suspense fallback={<Spinner animation="border" variant="primary" />}>
                  <FollowersFollowingList userId={profileData.profile?.uid || ''} type={tabKey as 'followers' | 'following'} />
                  <div className="text-center mt-3">
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        setShowUsersInTab(false);
                        navigate(`?tab=${tabKey}`, { replace: true });
                      }}
                      aria-label={`View ${tabKey} errands`}
                    >
                      View {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)} Errands
                    </Button>
                  </div>
                </Suspense>
              ) : (
                <>
                  {tabLoading ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" variant="primary" role="status" aria-label="Loading errands" />
                    </div>
                  ) : (
                    <UsersErrandFeed errands={profileData[`${tabKey}Errands` as keyof ProfileData] as Errand[]} />
                  )}
                  <div className="text-center mt-3">
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        setShowUsersInTab(true);
                        navigate(`?tab=${tabKey}&view=users`, { replace: true });
                      }}
                      aria-label={`View ${tabKey} users`}
                    >
                      View {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)} Users
                    </Button>
                  </div>
                  {profileData[`last${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}Doc` as LastDocKey] && (
                    <div className="text-center mt-3">
                      <Button
                        variant="outline-primary"
                        onClick={() => handleLoadMore(`${tabKey}Errands` as keyof ProfileData)}
                        disabled={tabLoading}
                        aria-label={`Load more ${tabKey} errands`}
                      >
                        {tabLoading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Tab.Pane>
          ))}
          <Tab.Pane eventKey="reviews" active={tab === 'reviews'}>
            {profileData.reviews.length === 0 ? (
              <p className="text-muted text-center py-3">No reviews yet.</p>
            ) : (
              <UsersErrandFeed errands={profileData.errands.filter(e => profileData.reviews.some(r => r.errandId === e.id))} />
            )}
          </Tab.Pane>
          <Tab.Pane eventKey="history" active={tab === 'history'}>
            {profileData.errandHistory.length === 0 ? (
              <p className="text-muted text-center py-3">No errand history yet.</p>
            ) : (
              <UsersErrandFeed errands={profileData.errands.filter(e => profileData.errandHistory.some(h => h.errandId === e.id))} />
            )}
          </Tab.Pane>
          <Tab.Pane eventKey="settings" active={tab === 'settings'}>
            {tab === 'settings' && profileData.profile && (
              <Card className="shadow-sm">
                <Card.Body>
                  <h4>Settings</h4>
                  <p><strong>Notification Preferences:</strong> Email: {profileData.profile.notificationPreferences?.email ? 'On' : 'Off'}, Push: {profileData.profile.notificationPreferences?.push ? 'On' : 'Off'}</p>
                  <p><strong>Privacy Settings:</strong> Profile: {profileData.profile.privacySettings?.profileVisibility || 'N/A'}, Errand History: {profileData.profile.privacySettings?.errandHistoryVisibility || 'N/A'}, Show Reviews: {profileData.profile.privacySettings?.showReviews ? 'Yes' : 'No'}</p>
                  {profileData.profile.accountDetails && (
                    <p><strong>Account Details:</strong> Bank: {profileData.profile.accountDetails?.bankName}, Account: {profileData.profile.accountDetails.accountName} ({profileData.profile.accountDetails?.accountNumber})</p>
                  )}
                </Card.Body>
              </Card>
            )}
          </Tab.Pane>
        </Tab.Content>
      </Suspense>
      <ShareModal
        show={showShareModal}
        onHide={() => setShowShareModal(false)}
        errandUrl={shareUrl}
        title={
          profileData.profile
            ? `@${profileData.profile.username}`
            : 'Check out this profile on RunAmForMe!'
        }
      />
    </Container>
  );
};

export default UserProfilePage;