import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signOut } from "../components/LoginFrontend/auth";

function Prep() {
  const [prep, setPrepPlan] = useState([]);// array of course objects
  const [loading, setLoading] = useState(false);// loading flag
  const navigate = useNavigate();

  useEffect(() => {
    const resource_owner = localStorage.getItem("resource_owner");
    const token = localStorage.getItem("refresh_token");
    if (!resource_owner) {
      console.log("No resource owner found in local storage.");
      return;
    }

    async function getPrepPlan() {
      setLoading(true);
      try {
        const user = JSON.parse(resource_owner);
        const result = await axios.get("http://localhost:8080/api/prepPlan", {
          headers: { Authorization: `Bearer ${token}` },
          params: { userId: user.id },
        });

        // Check if the response contains courses or just a single course object
        const data = result.data.courses ?? result.data;
        setPrepPlan(data);
      } catch (error) {
        console.error("Error fetching prepPlan:", error);
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          alert("Session expired. Please log in again.");
          signOut();
          navigate("/sign-up");
        } else {
          alert("Failed to load your prep plan. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    }

    getPrepPlan();
  }, [navigate]);

  return (
    <div className="p-4 relative">
      <h1 className="text-2xl font-bold mb-2">Final Exam Preparation Plan</h1>

      {/* Dim note at the top */}
      <p className="text-gray-500 text-sm italic mb-4">
        Note: Not all course calendars may be here; some may be unavailable or not yet updated.
      </p>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
          <span>This takes a minute...</span>
        </div>
      )}

      {/* Render courses once loaded */}
      {!loading && prep.length > 0 && prep.map((course, idx) => (
        <div key={idx} className="mb-8">
          <h2 className="text-xl font-semibold">{course.course_title || "Untitled Course"}</h2>

          {course.topics && course.topics.length > 0 ? (
            <ul className="list-disc pl-5 space-y-3 mt-2">
              {console.log(course.topics)}
              
              {course.topics.map((topic, tIdx) => (
                
                
                <li key={tIdx} className="pb-1">
                  <div className="text-sm text-gray-500 mb-1">{topic.date}</div>
                  <div>
                    <span className="font-medium">{topic.title}</span>: {topic.context}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="italic text-gray-500 mt-2">{course.note}</p>
          )}
        </div>
      ))}

      {/* Fallback if no data at all */}
      {!loading && prep.length === 0 && (
        <p>No preparation plan data available.</p>
      )}
    </div>
  );
}

export default Prep;