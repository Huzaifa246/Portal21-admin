import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from "react-router-dom";
import PostCard from './../Reuseable/PostCard';
import { collection, getDocs, query, orderBy, where, limit, startAfter } from 'firebase/firestore';
import { formatDistanceToNowStrict, subHours } from 'date-fns';
import Loader from './../Reuseable/Loader';
import { db } from "../../firebase/firebaseConfig";
import imageplaceholder from "../../images/placeholder-image.jpg";
const POSTS_PER_PAGE = 20;

const AllPosts = () => {
  const [latestPosts, setLatestPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [page, setPage] = useState(1); 
  const [totalPages, setTotalPages] = useState(1); 
  const [hasMorePosts, setHasMorePosts] = useState(true); 
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        fetchPosts();
      }
    });
  }, []);

  const fetchPosts = async (pageNumber = 1) => {
    setLoading(true);

    try {
      const postsCollection = collection(db, 'userPosts');
      const currentTime = new Date();
      const last48Hours = subHours(currentTime, 48);

      let postsQuery = query(
        postsCollection,
        where('timePublished', '>=', last48Hours),
        orderBy('timePublished', 'desc'),
        limit(POSTS_PER_PAGE)
      );

      if (pageNumber > 1 && lastVisible) {
        postsQuery = query(
          postsCollection,
          where('timePublished', '>=', last48Hours),
          orderBy('timePublished', 'desc'),
          startAfter(lastVisible),
          limit(POSTS_PER_PAGE)
        );
      }

      const postsSnapshot = await getDocs(postsQuery);

      // Get the last document of this page to fetch the next page
      const lastVisiblePost = postsSnapshot.docs[postsSnapshot.docs.length - 1];
      setLastVisible(lastVisiblePost);

      // Map through posts and update the state
      const postsList = postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      postsList.sort((a, b) => {
        const ratingA = a['rating'] || 0;
        const ratingB = b['rating'] || 0;
        if (ratingA === ratingB) {
          return b.timePublished.seconds - a.timePublished.seconds;
        }
        return ratingB - ratingA;
      });

      if (postsList.length < POSTS_PER_PAGE) {
        setHasMorePosts(false);
      } else {
        setHasMorePosts(true);
      }

      setLatestPosts(postsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
    }
  };

  const fetchTotalPages = async () => {
    const postsCollection = collection(db, 'userPosts');
    const currentTime = new Date();
    const last48Hours = subHours(currentTime, 48);

    // Get the total count of posts within the last 48 hours
    const totalPostsSnapshot = await getDocs(
      query(postsCollection, where('timePublished', '>=', last48Hours))
    );

    const totalPosts = totalPostsSnapshot.size;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    setTotalPages(totalPages);
  };

  const handlePageClick = (pageNumber) => {
    setPage(pageNumber);
    fetchPosts(pageNumber);
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      handlePageClick(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      handlePageClick(page - 1);
    }
  };

  const renderPageButtons = () => {
    let pageButtons = [];

    // Calculate the start and end page numbers to show
    const startPage = Math.max(1, page - 1); // Start with page 1 or one before the current page
    const endPage = Math.min(totalPages, page + 1); // End with the totalPages or one after the current page

    // Back button should be outside of page button generation
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          className={`mx-1 px-4 py-2 rounded ${page === i ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-white'
            }`}
        >
          {i}
        </button>
      );
    }

    return pageButtons;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-5">
      <h1 className="text-white text-2xl font-bold mb-6">All Latest Posts</h1>

      {loading ? (
        <p>
          <Loader />
        </p>
      ) : (
        <>
          {latestPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {latestPosts.map((post) => (
                <PostCard
                  key={post.id}
                  image={post.postPhoto || imageplaceholder}
                  title={post.SourceName}
                  description={post.postDescription}
                  likes={post.rating}
                  comments={post.comments}
                  ShareLink={post?.sourceLink}
                  category={post?.postCategory}
                  createdAt={
                    post.timePublished
                      ? formatDistanceToNowStrict(post.timePublished.toDate())
                      : 'Unknown time'
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No posts found</p>
          )}

          {/* Pagination Buttons */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handlePrevPage}
              className={`bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={page === 1}
            >
              Back
            </button>

            {/* Dynamic Page Buttons */}
            {renderPageButtons()}

            <button
              onClick={handleNextPage}
              className={`bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold py-2 px-4 rounded ${!hasMorePosts || page === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={!hasMorePosts || page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AllPosts;
