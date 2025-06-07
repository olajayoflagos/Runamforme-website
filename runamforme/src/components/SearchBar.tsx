import React, { useState, useCallback, useEffect } from 'react';
import { Form, InputGroup, Spinner } from 'react-bootstrap'; // Removed Button
import type { UserProfile } from '../types'; // Changed from Errand
import { debounce } from 'lodash';
import { searchUsersByUsername } from '../firebase/firestore'; // Import the user search function

interface SearchBarProps {
  // Updated to expect UserProfile results and removed hasMore
  onSearchResults: (results: UserProfile[]) => void;
  onSearchLoading?: (loading: boolean) => void;
  onSearchError?: (error: string | null) => void;
  initialQuery?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearchResults,
  onSearchLoading,
  onSearchError,
  initialQuery = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  // Removed state for hasMore and lastVisible as user search is simplified for now

  const executeSearch = useCallback(async (term: string) => { // Removed loadMore parameter
    if (!term.trim() || term.trim().length < 2) { // Added check for min length
      onSearchResults?.([]); // Clear results if term is empty or too short
      return;
    }

    try {
      setIsSearching(true);
      onSearchLoading?.(true);
      onSearchError?.(null);

      // Call the user search function directly
      const results = await searchUsersByUsername(term);

      // Pass results directly to the callback
      onSearchResults?.(results);

    } catch (error) {
      console.error('User search error:', error);
      onSearchError?.('Failed to search users. Please try again.');
      onSearchResults?.([]); // Clear results on error
    } finally {
      setIsSearching(false);
      onSearchLoading?.(false);
    }
  }, [onSearchError, onSearchLoading, onSearchResults]); // Removed lastVisible and executeSearch dependency cycle

  // Debounce the search execution
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      executeSearch(term);
    }, 500),
    [executeSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Trigger search only if term is not empty
    if (value.trim()) {
      debouncedSearch(value);
    } else {
      debouncedSearch.cancel(); // Cancel any pending debounced search
      onSearchResults?.([]); // Clear results immediately if input is cleared
    }
  };

  // Execute search on initialQuery when the component mounts
  useEffect(() => {
    if (initialQuery) {
      setSearchTerm(initialQuery);
      executeSearch(initialQuery);
    }
    // Cleanup debounce on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [initialQuery, executeSearch, debouncedSearch]); // Added debouncedSearch to dependency array

  return (
    <div className="search-container">
      <Form>
        <InputGroup>
          <InputGroup.Text>
            {isSearching ? <Spinner animation="border" size="sm" /> : <i className="bi bi-search" />}
          </InputGroup.Text>
          <Form.Control
            type="search"
            // Updated placeholder text
            placeholder="Search users by username..."
            value={searchTerm}
            onChange={handleChange}
            aria-label="Search users"
            // minLength removed, handled in executeSearch
          />
        </InputGroup>
      </Form>

      {/* Removed Load More button as pagination is not implemented for user search here */}
    </div>
  );
};

export default SearchBar;

// Removed the placeholder searchErrands function
