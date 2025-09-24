"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import axios from "axios"
import throttle from "lodash.throttle"
import { useNavigate } from "react-router-dom"
import { signOut } from "../components/LoginFrontend/auth"

function CourseSearch() {
  // States for the two sets of courses and query etc.
  const [deptCourses, setDeptCourses] = useState([])
  const [serverCourses, setServerCourses] = useState([])
  const [query, setQuery] = useState("")
  const [loadingDept, setLoadingDept] = useState(true)
  const [loadingServer, setLoadingServer] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [userSchedule, setUserSchedule] = useState([])
  const navigate = useNavigate()

  // Create throttled search function outside of useEffect to prevent recreation
  const throttledSearch = useCallback(
    throttle(async (searchTerm) => {
      if (!searchTerm || searchTerm.trim().length < 1) {
        // Changed from 2 to 1 to allow single letter searches
        setServerCourses([])
        setLoadingServer(false)
        return
      }

      setLoadingServer(true)
      try {
        const response = await axios.get("http://localhost:8080/api/courses/search", {
          params: { q: searchTerm },
        })

        setServerCourses(response.data.courses || [])
      } catch (err) {
        console.error("Error fetching courses in live search:", err)
        setError("Error while searching courses. Please try again later.")
      } finally {
        setLoadingServer(false)
      }
    }, 500),
    [setServerCourses, setLoadingServer, setError],
  )

  // Step 1: Fetch department courses when component mounts
  useEffect(() => {
    const fetchDepartmentCourses = async () => {
      try {
        const storedUser = localStorage.getItem("resource_owner")
        let department = ""
        const token = localStorage.getItem("refresh_token");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser)
            department = user.Department || ""
          } catch (err) {
            console.error("Error parsing user data:", err)
            setError("Error accessing user information. Please log in again.")
            return
          }
        }

        const response = await axios.get("http://localhost:8080/api/courses/department", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: { department },
        })

        setDeptCourses(response.data.courses || [])
      } catch (error) {
        
        const status = error.response?.status;
        if (status === 401 || status === 403) {
            alert("Session expired. Please log in again.");
            signOut();
            navigate("/sign-up");
        } else {
            console.error("Error fetching department courses:", error)
            setError("Error fetching department courses. Please rrefresh the page.")
        }
      } finally {
        setLoadingDept(false)
      }
    }

    fetchDepartmentCourses()
  }, [navigate, setError, setDeptCourses, setLoadingDept])

  // Step 2: Live server search (trigger for query length >= 1)
  useEffect(() => {
    throttledSearch(query)

    return () => {
      throttledSearch.cancel()
    }
  }, [query, throttledSearch])

  // Fetch user's schedule when component mounts
  useEffect(() => {
    const fetchUserSchedule = async () => {
      try {
        const storedUser = localStorage.getItem("resource_owner");
        const token = localStorage.getItem("refresh_token");
        if (!storedUser) return

        let user
        try {
          user = JSON.parse(storedUser)
        } catch (err) {
          console.error("Error parsing user data:", err)
          return
        }

        const userId = user.id || user.UserID
        if (!userId) return

        const response = await axios.get("http://localhost:8080/api/userSchedule", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: { userId },
        })

        setUserSchedule(response.data.courses || [])
      } catch (err) {
        console.error("Error fetching user schedule:", err)
      }
    }

    fetchUserSchedule()
  }, [])

  // Step 3: Merge local (department) courses with server results
  const finalCourses = useMemo(() => {
    // For empty queries, show top department courses
    if (query.trim() === "") {
      return deptCourses.slice(0, 6)
    }

    const lowerQuery = query.toLowerCase().trim()

    // Debug information for troubleshooting
    const debugData = {
      query: lowerQuery,
      deptCoursesTotal: deptCourses.length,
      serverCoursesTotal: serverCourses.length,
      deptCoursesMatching: [],
      serverCoursesMatching: [],
    }

    // Filter department courses that match the query
    const filteredDept = deptCourses.filter((course) => {
      const courseName = (course.Title || "").toLowerCase()
      const courseCode = `${course.Subject || ""} ${course.Course || ""}`.toLowerCase()

      const nameMatch = courseName.includes(lowerQuery)
      const codeMatch = courseCode.includes(lowerQuery)

      if (nameMatch || codeMatch) {
        debugData.deptCoursesMatching.push({
          id: course.course_id,
          name: course.Title,
          code: `${course.Subject} ${course.Course}`,
          nameMatch,
          codeMatch,
        })
      }

      return nameMatch || codeMatch
    })

    // Filter server courses and avoid duplicates
    const filteredServer = serverCourses.filter((serverCourse) => {
      // Check if this course is already in filteredDept
      const isDuplicate = filteredDept.some((deptCourse) => deptCourse.course_id === serverCourse.course_id)

      if (!isDuplicate) {
        debugData.serverCoursesMatching.push({
          id: serverCourse.course_id,
          name: serverCourse.Title,
          code: `${serverCourse.Subject} ${serverCourse.Course}`,
        })
      }

      return !isDuplicate
    })

    // Combine both lists but keep track of their source
    const allCourses = [
      ...filteredDept.map((course) => ({ ...course, source: "department" })),
      ...filteredServer.map((course) => ({ ...course, source: "server" })),
    ]

    // Sort results to prioritize:
    // Department courses over server courses
    // Then courses that start with the query
    // Then alphabetically
    const sortedCourses = allCourses.sort((a, b) => {
      const aName = (a.Title || "").toLowerCase()
      const bName = (b.Title || "").toLowerCase()
      const aCode = `${a.Subject || ""} ${a.Course || ""}`.toLowerCase()
      const bCode = `${b.Subject || ""} ${b.Course || ""}`.toLowerCase()

      // First priority: Department courses come before server courses
      if (a.source === "department" && b.source === "server") return -1
      if (a.source === "server" && b.source === "department") return 1

      // Second priority: Courses that start with the query
      const aNameStarts = aName.startsWith(lowerQuery)
      const bNameStarts = bName.startsWith(lowerQuery)
      const aCodeStarts = aCode.startsWith(lowerQuery)
      const bCodeStarts = bCode.startsWith(lowerQuery)

      if (aNameStarts && !bNameStarts) return -1
      if (!aNameStarts && bNameStarts) return 1
      if (aCodeStarts && !bCodeStarts) return -1
      if (!aCodeStarts && bCodeStarts) return 1

      // Third priority: Alphabetical order
      return aName.localeCompare(bName)
    })

    // Update debug info
    debugData.finalCoursesCount = sortedCourses.length
    debugData.finalCourses = sortedCourses.map((c) => ({
      id: c.course_id,
      name: c.Title,
      code: `${c.Subject} ${c.Course}`,
    }))

    // Store debug info for display
    setDebugInfo(debugData)

    return sortedCourses.slice(0, 6) // Limit to top 5 courses
  }, [deptCourses, serverCourses, query])

  // Helper function to check if a course is already in the user's schedule
  const isCourseInSchedule = useCallback(
    (courseId) => {
      return userSchedule.some((course) => course.course_id === courseId)
    },
    [userSchedule],
  )

  // Step 4: Handler for adding course to schedule
  const handleAddCourse = async (e, course) => {
    e.preventDefault()
    try {
      const storedUser = localStorage.getItem("resource_owner")
      if (!storedUser) {
        setError("User not logged in. Please log in to add courses to your schedule.")
        return
      }

      let user
      try {
        user = JSON.parse(storedUser)
      } catch (err) {
        console.error("Error parsing user data:", err)
        setError("Error accessing user information. Please log in again.")
        return
      }

      const userId = user.id || user.UserID
      if (!userId) {
        setError("User ID not found. Please log in again.")
        return
      }

      // Construct payload
      const payload = {
        userId,
        courseId: course.course_id,
      }

      const res = await axios.post("http://localhost:8080/api/addCourseToSchedule", payload, {
        headers: { "Content-Type": "application/json" },
      })

      // Update the userSchedule state to include the newly added course
      setUserSchedule([...userSchedule, course])
    } catch (err) {
      console.error("Error adding course:", err.response?.data?.message)
      setError(`Sorry course has not been updated or conflicts with your existing schedule`)
    }
  }

  // Clear error message
  const clearError = () => setError(null)

  // Helper function to format days display
  const formatDays = (daysString) => {
    if (!daysString || !daysString.trim()) return ""

    const days = {
      M: "Mon",
      T: "Tue",
      W: "Wed",
      R: "Thu",
      F: "Fri",
      S: "Sat",
      U: "Sun",
    }

    const formattedDays = []
    for (let i = 0; i < daysString.length; i++) {
      const char = daysString[i]
      if (char !== " " && days[char]) {
        formattedDays.push(days[char])
      }
    }

    return formattedDays.join(", ")
  }

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Course Search</h2>

      {/* Error message with dismiss button */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-md mb-6 relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={clearError}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
            aria-label="Dismiss error"
          >
            <span className="text-xl font-semibold">×</span>
          </button>
        </div>
      )}

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search courses by name or code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 pl-4 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          disabled={loadingDept}
        />
        {loadingServer && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Loading indicators and results */}
      {loadingDept ? (
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600 font-medium">Loading department courses...</span>
        </div>
      ) : query.trim() === "" ? (
        <div className="text-gray-500 p-6 bg-gray-50 rounded-lg text-center">
          <p>Start typing to search for courses in your department and more...</p>
          <p className="text-sm mt-2 text-gray-400">Try searching by course code (e.g., "MAT 201") or course name</p>
        </div>
      ) : finalCourses.length === 0 ? (
        <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-lg">
          <p className="font-medium">No courses match your search.</p>
          <p className="text-sm mt-2 text-gray-500">Try using different keywords or check your spelling</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {finalCourses.map((course) => (
            <li
              key={course.course_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="mb-3 sm:mb-0">
                <div className="flex items-center mb-1">
                  <span className="font-semibold text-gray-800">{course.Title}</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-sm rounded-md font-medium">
                    {`${course.Subject} ${course.Course}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                  {course.Department && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {course.Department}
                    </span>
                  )}
                  {course.Meeting_Time && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {course.Meeting_Time}
                    </span>
                  )}
                  {course.Days && course.Days.trim() && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {formatDays(course.Days)}
                    </span>
                  )}
                  {course.Primary_Instructor && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {course.Primary_Instructor}
                    </span>
                  )}
                  {course.Classroom && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {course.Classroom}
                    </span>
                  )}
                </div>
              </div>

              {isCourseInSchedule(course.course_id) ? (
                <button
                  disabled
                  className="bg-green-500 text-white px-4 py-2 rounded-md opacity-75 cursor-not-allowed flex items-center justify-center min-w-[100px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Added
                </button>
              ) : (
                <button
                  onClick={(e) => handleAddCourse(e, course)}
                  className="cursor-pointer bg-sky-800 hover:bg-sky-600 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center min-w-[100px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CourseSearch
