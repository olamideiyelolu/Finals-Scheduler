"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { signOut } from "../components/LoginFrontend/auth"
import axios from "axios"

const departments = [
  "Behavioral Sciences",
  "Biology and Chemistry",
  "Business (Graduate)",
  "Business (Undergraduate)",
  "Communication & Public Affairs",
  "Computing and Mathematics",
  "Education (Graduate)",
  "Education (Undergraduate)",
  "Engineering",
  "Graduate School of Counseling",
  "Health, Leisure/Sport Sciences",
  "Honors",
  "Liberal Arts",
  "Nursing (Graduate)",
  "Nursing (Undergraduate)",
  "Theology & Ministry (Graduate)",
  "Theology and Ministry (UG)",
  "Worship/Media/Performing Arts",
]

function Profile() {
  const [user, setUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const resource_owner = localStorage.getItem("resource_owner")
    console.log("resource_owner", resource_owner)

    if (resource_owner) {
      const userData = JSON.parse(resource_owner)
      setUser(userData)
      setFormData(userData)
    }
  }, [])

  const handleSignOut = () => {
    signOut() // clear tokens, etc.
    navigate("/sign-up") // redirect to login
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  const handleDepartmentChange = (e) => {
    setFormData((prev) => (prev ? { ...prev, Department: e.target.value } : null))
  }

  const handleSave = async () => {
    if (!formData) return

    setIsLoading(true)
    try {
        const response = await axios.put(
            `http://localhost:8080/api/updateUser`,
            formData
        );
        console.log("response", response.data)


      // Update local storage with new data
      localStorage.setItem("resource_owner", JSON.stringify(formData))

      // Update state
      setUser(formData)
      setIsEditing(false)

      // Show success message
      console.log("Profile updated successfully")
    } catch (error) {
        console.error("Error updating profile:", error)
    } finally {
        setIsLoading(false)
    }
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Profile</h2>
          <button
            className=" cursor-pointer p-2 rounded-full hover:bg-gray-200"
            onClick={() => setIsEditing(!isEditing)}
            disabled={isLoading}
          >
            {isEditing ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isEditing ? (
            // Edit mode
            <>
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  className="w-full p-2 border rounded-md"
                  value={formData?.firstName || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  className="w-full p-2 border rounded-md"
                  value={formData?.lastName || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full p-2 border rounded-md"
                  value={formData?.email || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="Department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  id="Department"
                  name="Department"
                  className="w-full p-2 border rounded-md bg-white"
                  value={formData?.Department || ""}
                  onChange={handleDepartmentChange}
                >
                  <option value="" disabled>
                    Select a Department
                  </option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            // View mode
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">First Name</p>
                  <p className="font-medium">{user.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Name</p>
                  <p className="font-medium">{user.lastName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{user.Department}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <button
            className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            onClick={handleSignOut}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
          {isEditing && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
