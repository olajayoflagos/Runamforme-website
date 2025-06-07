import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Card } from 'react-bootstrap';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import type { UserProfile } from '../types';


const Home: React.FC = () => {
  const { currentUser, loading } = useAuth();
  // State to hold search results (expecting UserProfile objects now)
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <Container className="py-3 py-md-5">
      <Helmet>
        <title>RunAmForMe - Get Things Done Fast</title>
        <meta
          name="description"
          content="Connect with trusted local runners for errands, deliveries, and tasks. Post a request or earn money helping others!"
        />
        <meta property="og:title" content="RunAmForMe - Get Things Done Fast" />
        <meta property="og:description" content="Connect with trusted local runners for your daily tasks and errands" />
      </Helmet>

      <Row className="justify-content-center">
        <Col lg={10} xl={8}>
          <section className="mb-4">
            {/* Pass the setSearchResults function to update the state with the search results */}
            <SearchBar onSearchResults={setSearchResults} />
            {/* Display search results if there are any */}
            {searchResults.length > 0 && (
              <div className="mt-3">
                <h3 className="h5 mb-3">Search Results</h3>
                <div className="list-group">
                  {searchResults.map((user) => (
                    <Link
                      key={user.id}
                      // Ensure the link uses the user's username
                      to={`/profile/${user.username}`}
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      aria-label={`View profile of ${user.username}`}
                    >
                      <img
                        src={user.avatarUrl || '/default-avatar.png'}
                        alt={`${user.username}'s avatar`}
                        className="rounded-circle me-2"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                      <div>
                        <strong>{user.username}</strong>
                        <p className="mb-0 text-muted">{user.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section
            className="py-4 px-3 px-md-5 bg-primary text-white rounded-3 shadow mb-5"
            aria-labelledby="hero-heading"
          >
            <div className="text-center">
              <h1 id="hero-heading" className="display-5 fw-bold mb-3">
                RunAmForMe: Get Things Done. Fast.
              </h1>
              <p className="lead mb-4 opacity-75">
                Connect with trusted local runners for your errands, deliveries, and tasks.
                Post a request or earn money helping others!
              </p>
              <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                {currentUser ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="btn btn-light btn-lg px-4 gap-3 fw-bold"
                      aria-label="Go to your dashboard"
                    >
                      Go to Dashboard
                    </Link>
                    <Link
                      to="/errands"
                      className="btn btn-outline-light btn-lg px-4 fw-bold"
                      aria-label="Browse available errands"
                    >
                      Browse Errands
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="btn btn-light btn-lg px-4 gap-3 fw-bold"
                      aria-label="Register for a free account"
                    >
                      Get Started - Free
                    </Link>
                    <Link
                      to="/login"
                      className="btn btn-outline-light btn-lg px-4 fw-bold"
                      aria-label="Log in to your account"
                    >
                      Existing User Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="how-it-works-heading" className="mb-5">
            <h2 id="how-it-works-heading" className="text-center mb-4">How It Works</h2>
            <Row className="g-4">
              {[
                {
                  step: "1",
                  title: "Post an Errand",
                  description: "Describe your task, set a fee, and post it in seconds."
                },
                {
                  step: "2",
                  title: "Get Offers Fast",
                  description: "Local runners see your request and offer to help immediately."
                },
                {
                  step: "3",
                  title: "Pay & Review",
                  description: "Securely complete the task, pay the runner, and leave a review."
                }
              ].map((item, index) => (
                <Col md={4} key={index}>
                  <Card className="h-100 border-0 shadow-sm">
                    <Card.Body className="text-center p-4">
                      <div
                        className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3"
                        style={{ width: '50px', height: '50px' }}
                        aria-hidden="true"
                      >
                        <span className="fs-4 fw-bold">{item.step}</span>
                      </div>
                      <Card.Title as="h3" className="h5 mb-3">{item.title}</Card.Title>
                      <Card.Text className="text-muted">
                        {item.description}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          <section aria-labelledby="testimonials-heading" className="mb-5">
            <h2 id="testimonials-heading" className="text-center mb-4">What Our Users Say</h2>
            <Row className="g-4">
              {[
                {
                  quote: "Saved me hours of time when I needed groceries delivered same day!",
                  author: "Sarah K."
                },
                {
                  quote: "Earned over NGN95,500 in my first month running errands after work.",
                  author: "Michael T."
                },
                {
                  quote: "The payment system is secure and easy to use. Highly recommend!",
                  author: "Temitope M."
                }
              ].map((testimonial, index) => (
                <Col md={4} key={index}>
                  <Card className="h-100 border-primary">
                    <Card.Body className="text-center p-4">
                      <blockquote className="blockquote mb-0">
                        <p className="font-italic">"{testimonial.quote}"</p>
                        <footer className="blockquote-footer mt-3">
                          <cite>{testimonial.author}</cite>
                        </footer>
                      </blockquote>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
