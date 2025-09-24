"use client"

import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Trash2, Calendar } from "lucide-react"
import { signOut } from "../components/LoginFrontend/auth"

function Schedule() {
  const navigate = useNavigate()
  const [scheduledCourses, setScheduledCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [finalsLoading, setFinalsLoading] = useState(false)

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true)
      // Example GET endpoint: GET /api/schedule
      // Adjust as needed for your backend
      const user = localStorage.getItem("resource_owner")
      const token = localStorage.getItem("refresh_token")
      const userId = user ? JSON.parse(user).id : null // Assuming the user object has an id field

      const response = await axios.get("http://localhost:8080/api/userSchedule", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { userId },
      })

      const courses = response.data.courses || []
      setScheduledCourses(courses)

      // After getting the schedule, fetch finals information for each course
      if (courses.length > 0) {

        await fetchFinalsForCourses(courses)
      }
    } catch (error) {
      console.error(error)
      setError(error.response?.data?.message || error.message)
      const status = error.response?.status
      if (status === 401 || status === 403) {
        alert("Session expired. Please log in again.")
        signOut()
        navigate("/sign-up")
      } else {
        alert("Failed to load schedule. Please try again later.")
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    // On mount, fetch the user's schedule from the server
    fetchSchedule()
  }, [fetchSchedule])

  // New function to fetch finals information for each course
  const fetchFinalsForCourses = async (courses) => {
    try {
      setFinalsLoading(true)

      // Create an array of promises for each course's finals request
      const finalsTime = courses.map(async (course) => {
        const { Subject, Course, Meeting_Time, Classroom, Days } = course
        try {
          // Make a POST request to get finals information for this course
          const response = await axios.post("http://localhost:8080/api/schedule/final-time", {
            subject: Subject,
            course: Course,
            meetingTime: Meeting_Time,
            classroom: Classroom,
            days: Days,
            // Add any other required parameters for the finals endpoint
          })

          // Return the course with finals information added
          return {
            ...course,
            finalExam: response.data,
          }
        } catch (err) {
          console.error(`Failed to fetch finals for course ${course.Subject} ${course.Course}:`, err)
          // If finals fetch fails for a course, return the course without finals info
          return course
        }
      })

      // Wait for all finals requests to complete
      const coursesWithFinals = await Promise.all(finalsTime)

      // Update the state with courses that now include finals information
      setScheduledCourses(coursesWithFinals)
    } catch (err) {
      console.error("Error fetching finals information:", err)
    } finally {
      setFinalsLoading(false)
    }
  }

  // Removing a single course: DELETE /api/schedule/:courseId
  //    Then update the local state
  const removeCourse = async (courseId) => {

    try {
      // Example: maybe your server expects the code or an ID param
      const user = JSON.parse(localStorage.getItem("resource_owner"))
      const userId = user ? user.id : null // Assuming the user object has an id field

      await axios.delete(`http://localhost:8080/api/removeCourse`, {
        data: {
          userId: userId,
          courseId: courseId,
        },
      })

      fetchSchedule() // Re-fetch the schedule to ensure it's up-to-date
      // Filter out the removed course from the local state
      setScheduledCourses((prev) => prev.filter((c) => c.course_id !== courseId))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || "Failed to remove course.")
    }
  }

  // Function to add a course to Google Calendar
  const addToGoogleCalendar = (course) => {
    try {
      const finalTime = course.finalExam?.finalTime;
      if (!finalTime) {
        alert("No final exam information available for this course.");
        return;
      }
      
      const { Date: examDate, fStartT: startTime, fEndT: endTime, Location: location } = finalTime;
      
      const dateObj = new Date(examDate);
      
      // Updated parseTime function
      const parseTime = (timeStr) => {
        const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
        if (!m) throw new Error(`Bad time format: ${timeStr}`);
      
        let [, hh, mm, mer] = m; // Destructure the match array
        let hour   = Number(hh);
        const min  = Number(mm);
      
        if (mer) {    // if meridian is present
          mer = mer.toLowerCase();
          if (mer === "pm" && hour !== 12) hour += 12;   
          if (mer === "am" && hour === 12) hour = 0; 
        }
        return { hour, minute: min };
      };
      
      const { hour: sHour, minute: sMin } = parseTime(startTime);
      const { hour: eHour, minute: eMin } = parseTime(endTime);
      
      const startDate = new Date(examDate);        
      startDate.setHours(sHour, sMin, 0, 0);  
      const endDate   = new Date(examDate);
      endDate.setHours(eHour,  eMin,  0, 0);
      
      const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const startDateFormatted = fmt(startDate);
      const endDateFormatted = fmt(endDate);
      
      const eventTitle = `Final Exam: ${course.Subject} ${course.Course} - ${course.Title}`;
      const eventDescription = `Final exam for ${course.Title}\nInstructor: ${course.Primary_Instructor || "N/A"}`;
      const eventLocation = location || "TBA";
      
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDateFormatted}/${endDateFormatted}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
      
      window.open(googleCalendarUrl, "_blank");
    } catch (error) {
      console.error("Error adding to Google Calendar:", error);
      alert("Failed to add to Google Calendar. Please try again.");
    }
  };

  // If you want to handle back navigation via React Router
  const handleBackToSearch = () => {
    navigate("/")
  }

  // Helper function: Extract day of week from final exam date string
  const extractDayOfWeek = (dateString) => {
    if (!dateString) return "Unscheduled"
    return dateString.split(" ")[0]
  }

  // Format days display
  const formatDays = (daysString) => {
    if (!daysString || !daysString.trim()) return "N/A"

    const days = {
      M: "Monday",
      T: "Tuesday",
      W: "Wednesday",
      R: "Thursday",
      F: "Friday",
      S: "Saturday",
      U: "Sunday",
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

  // Group courses by final exam day
  const coursesByDay = scheduledCourses.reduce((acc, course) => {
    // If final exam date is present, use that; otherwise "Unscheduled"
    const finalDay = course.finalExam?.finalTime?.Date
    if (finalDay) {
      if (!acc[finalDay]) {
        acc[finalDay] = []
      }
      acc[finalDay].push(course)
    } else {
      if (!acc["Unscheduled"]) {
        acc["Unscheduled"] = []
      }
      acc["Unscheduled"].push(course)
    }
    return acc
  }, {})

  // Sort the days in a logical order
  const sortedDays = Object.keys(coursesByDay).sort((a, b) => {
    if (a === "Unscheduled") return 1
    if (b === "Unscheduled") return -1

    // Extract the day of the week from the date string
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const dayA = extractDayOfWeek(a)
    const dayB = extractDayOfWeek(b)

    const indexA = daysOfWeek.indexOf(dayA)
    const indexB = daysOfWeek.indexOf(dayB)

    if (indexA !== indexB) return indexA - indexB

    // If same day of week, compare the full date string
    return a.localeCompare(b)
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={handleBackToSearch} className="bg-sky-700 text-white px-4 py-2 rounded hover:bg-blue-700">
          Back to Search
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Final Exam Schedule</h1>
      </div>

      {finalsLoading && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
          <div className="inline-block animate-pulse mr-2">⟳</div>
          <span>Loading finals information...</span>
        </div>
      )}

      {scheduledCourses.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">You haven't added any courses to your schedule yet.</p>
        </div>
      ) : (
        <div className="space-y-8 ">
          {sortedDays.map((day) => (
            <div key={day} className="border rounded-lg overflow-hidden shadow-sm">
              <div className="bg-gray-100 p-3 font-bold text-lg border-b">{day}</div>
              <div className="divide-y">
                {coursesByDay[day].map((course, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{course.Title}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-sm rounded-md font-medium">
                            {`${course.Subject} ${course.Course}`}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-1">
                          <div className="flex flex-wrap gap-2">
                            {course.Department && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {course.Department}
                              </span>
                            )}
                            {course.Days && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {formatDays(course.Days)}
                              </span>
                            )}
                            {course.Meeting_Time && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {course.Meeting_Time}
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

                          {course.finalExam?.finalTime ? (
                            <div className="mt-4 p-4 bg-sky-800 rounded-md text-white">
                              <p className="font-semibold text-white mb-2">Final Exam:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <p>
                                  <span className="font-semibold">Date:</span> {course.finalExam.finalTime.Date}
                                </p>
                                <p>
                                  <span className="font-semibold">Time:</span> {course.finalExam.finalTime.fStartT} -{" "}
                                  {course.finalExam.finalTime.fEndT}
                                </p>
                                <p className="md:col-span-2">
                                  <span className="font-semibold">Location:</span>{" "}
                                  {course.finalExam.finalTime.Location || "TBA"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-yellow-600">No final exam information available</p>
                          )}
                        </div>
                      </div>
                      <div className="flex">
                        <button
                          onClick={() => addToGoogleCalendar(course)}
                          className="cursor-pointer text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-colors mr-1"
                          aria-label="Add to Google Calendar"
                        >
                          {/* <Calendar size={20} /> */}
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800px" height="800px" viewBox="0 0 256 256" version="1.1" preserveAspectRatio="xMidYMid">
                              <g>
                                  <polygon fill="#FFFFFF" points="195.368421 60.6315789 60.6315789 60.6315789 60.6315789 195.368421 195.368421 195.368421">

                          </polygon>
                                  <polygon fill="#EA4335" points="195.368421 256 256 195.368421 225.684211 190.196005 195.368421 195.368421 189.835162 223.098002">

                          </polygon>
                                  <path d="M1.42108547e-14,195.368421 L1.42108547e-14,235.789474 C1.42108547e-14,246.955789 9.04421053,256 20.2105263,256 L60.6315789,256 L66.8568645,225.684211 L60.6315789,195.368421 L27.5991874,190.196005 L1.42108547e-14,195.368421 Z" fill="#188038">

                          </path>
                                  <path d="M256,60.6315789 L256,20.2105263 C256,9.04421053 246.955789,1.42108547e-14 235.789474,1.42108547e-14 L195.368421,1.42108547e-14 C191.679582,15.0358547 189.835162,26.1010948 189.835162,33.1957202 C189.835162,40.2903456 191.679582,49.4356319 195.368421,60.6315789 C208.777986,64.4714866 218.883249,66.3914404 225.684211,66.3914404 C232.485172,66.3914404 242.590435,64.4714866 256,60.6315789 Z" fill="#1967D2">

                          </path>
                                  <polygon fill="#FBBC04" points="256 60.6315789 195.368421 60.6315789 195.368421 195.368421 256 195.368421">

                            </polygon>
                                    <polygon fill="#34A853" points="195.368421 195.368421 60.6315789 195.368421 60.6315789 256 195.368421 256">

                            </polygon>
                                    <path d="M195.368421,0 L20.2105263,0 C9.04421053,0 0,9.04421053 0,20.2105263 L0,195.368421 L60.6315789,195.368421 L60.6315789,60.6315789 L195.368421,60.6315789 L195.368421,0 Z" fill="#4285F4">

                            </path>
                                    <path d="M88.2694737,165.153684 C83.2336842,161.751579 79.7473684,156.783158 77.8442105,150.214737 L89.5326316,145.397895 C90.5936842,149.44 92.4463158,152.572632 95.0905263,154.795789 C97.7178947,157.018947 100.917895,158.113684 104.656842,158.113684 C108.48,158.113684 111.764211,156.951579 114.509474,154.627368 C117.254737,152.303158 118.635789,149.338947 118.635789,145.751579 C118.635789,142.08 117.187368,139.082105 114.290526,136.757895 C111.393684,134.433684 107.755789,133.271579 103.410526,133.271579 L96.6568421,133.271579 L96.6568421,121.701053 L102.72,121.701053 C106.458947,121.701053 109.608421,120.690526 112.168421,118.669474 C114.728421,116.648421 116.008421,113.886316 116.008421,110.366316 C116.008421,107.233684 114.863158,104.741053 112.572632,102.871579 C110.282105,101.002105 107.385263,100.058947 103.865263,100.058947 C100.429474,100.058947 97.7010526,100.968421 95.68,102.804211 C93.6602819,104.644885 92.1418208,106.968942 91.2673684,109.557895 L79.6968421,104.741053 C81.2294737,100.395789 84.0421053,96.5557895 88.1684211,93.2378947 C92.2947368,89.92 97.5663158,88.2526316 103.966316,88.2526316 C108.698947,88.2526316 112.96,89.1621053 116.732632,90.9978947 C120.505263,92.8336842 123.469474,95.3768421 125.608421,98.6105263 C127.747368,101.861053 128.808421,105.498947 128.808421,109.541053 C128.808421,113.667368 127.814737,117.153684 125.827368,120.016842 C123.84,122.88 121.397895,125.069474 118.501053,126.602105 L118.501053,127.292632 C122.241568,128.834789 125.490747,131.367752 127.898947,134.618947 C130.341053,137.903158 131.570526,141.827368 131.570526,146.408421 C131.570526,150.989474 130.408421,155.082105 128.084211,158.669474 C125.76,162.256842 122.543158,165.086316 118.467368,167.141053 C114.374737,169.195789 109.776842,170.240124 104.673684,170.240124 C98.7621053,170.256842 93.3052632,168.555789 88.2694737,165.153684 L88.2694737,165.153684 Z M160.067368,107.149474 L147.233684,116.429474 L140.816842,106.694737 L163.84,90.0884211 L172.665263,90.0884211 L172.665263,168.421053 L160.067368,168.421053 L160.067368,107.149474 Z" fill="#4285F4">

                            </path>
                                </g>
                            </svg>
                        </button>
                        <button
                          onClick={() => removeCourse(course.course_id)}
                          className="cursor-pointer text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                          aria-label="Remove course"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Schedule
