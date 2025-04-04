const Loading = () => {
  return (
    <>
      <style>
        {`
          .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
            box-sizing: border-box;
          }

          .image-wrapper {
            overflow: hidden;
            position: relative;
            max-width: 70%; /* Reduced max-width for smaller image on mobile */
            width: auto;
            height: auto;
            margin: 0 auto;
            padding: 5px;
          }

          .loading-image {
            display: block;
            max-width: 100%;
            height: auto;
            transform: translateX(-50%); /* Initial position (x1) - halfway left */
            animation: oscillate-x 1.5s ease-in-out infinite alternate; /* Oscillate animation */
          }

          /* --- Oscillate X Animation --- */
          @keyframes oscillate-x {
            0% {
              transform: translateX(-3%); /* Position x1 - Left */
            }
            100% {
              transform: translateX(3%); /* Position x2 - Right */
            }
          }

          /* --- Responsive Adjustments --- */
          @media (min-width: 769px) {
            .image-wrapper {
              max-width: 300px; /* Reduced max-width for smaller image on wider screens */
            }
          }

          @media (max-width: 320px) {
            .login-container {
              padding: 10px;
            }
            .image-wrapper {
              max-width: 80%; /* Slightly larger on very small screens if 70% is too small */
            }
          }
        `}
      </style>
      <div className="login-container bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
        <div className="image-wrapper">
          <img
            src="/Sora.png"
            alt="Loading"
            className="loading-image"
          />
        </div>
      </div>
    </>
  );
};

export default Loading;