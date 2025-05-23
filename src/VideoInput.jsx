import React, { useState, createContext, useEffect, useRef } from "react";
import "./index.css";

// 전역 상태 관리를 위한 Context 생성
export let UrlContext = createContext();
export let TimestampContext = createContext();

/**
 * 비디오 URL 입력 컴포넌트
 * - YouTube URL 입력 폼 제공
 * - URL 유효성 검사
 * - 자식 컴포넌트들에게 URL과 타임스탬프 정보 제공
 */
const VideoInput = ({ onVideoSubmit, children }) => {
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [currentTimestamp, setCurrentTimestamp] = useState("");
  const debounceTimeout = useRef(null);

  /**
   * YouTube URL에서 비디오 ID 추출
   */
  const extractVideoId = (url) => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  /**
   * ✅ URLSearchParams로 videoUrl 쿼리 파라미터 읽어 초기 상태로 설정
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFromQuery = params.get("videoUrl");
    if (urlFromQuery) {
      setVideoUrl(urlFromQuery);
    }
  }, []); // 최초 마운트 시 1회 실행

  // ✅ debounce 입력값 처리
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (!videoUrl) return;
    debounceTimeout.current = setTimeout(() => {
      const videoId = extractVideoId(videoUrl);
      if (videoId) {
        setError("");
        fetch('http://localhost:5000/api/process-youtube', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ youtube_url: videoUrl }),
        })
          .then(async (response) => {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text();
              throw new Error(`Invalid response: ${text}`);
            }
            return response.json();
          })
          .then(data => {
            if (data.status === 'success') {
              console.log('Highlights:', data.highlights);
              onVideoSubmit(videoUrl);
            } else {
              setError(data.error || 'Failed to process video');
            }
          })
          .catch((error) => {
            console.error('Error:', error);
            setError(error.message || 'An error occurred while processing the video.');
          });
      } else {
        setError("Invalid YouTube URL. Please enter a valid video link.");
      }
    }, 500);
    return () => clearTimeout(debounceTimeout.current);
  }, [videoUrl]);

  return (
    <UrlContext.Provider value={videoUrl}>
      <TimestampContext.Provider value={{ currentTimestamp, setCurrentTimestamp }}>
        <div className="input-container">
          <h2>유튜브 하이라이터</h2>
          <form onSubmit={e => e.preventDefault()}>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="유튜브 영상 주소를 입력하세요:"
            />
          </form>
          {error && <p className="error-message">{error}</p>}
          {children}
        </div>
      </TimestampContext.Provider>
    </UrlContext.Provider>
  );
};

export default VideoInput;
