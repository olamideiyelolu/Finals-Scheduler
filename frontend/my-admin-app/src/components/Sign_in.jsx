"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MainLogin } from "./Main_login"

function Sign_in() {
  const navigate = useNavigate()
  useEffect(() => {
    MainLogin(navigate)
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 p-4 space-y-8">
      {/* Header Section */}
      <div className="text-center mb-6 max-w-2xl">
        <h1 className="text-4xl font-bold text-sky-700 mb-4">Welcome to Finals Scheduler</h1>
        <p className="text-sky-600 text-lg mb-2">Plan your schedule for the finals with 100% accuracy</p>
        <p className="text-sky-500">Organize your study time efficiently and never miss an exam</p>
      </div>


      <form
        id="sign_in_form"
        className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-md border border-sky-100"
      >
        <h2 className="text-2xl font-semibold text-sky-700 mb-4 text-center">Sign In</h2>
        <input
          className="w-full p-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-300 focus:border-sky-300 outline-none transition"
          type="email"
          id="signin-email"
          placeholder="Email"
        />
        <input
          className="w-full p-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-300 focus:border-sky-300 outline-none transition"
          type="password"
          id="signin-password"
          placeholder="Password"
        />
        <button
          type="submit"
          className="w-full bg-sky-600 text-white p-3 rounded-lg hover:bg-sky-700 transition font-medium"
        >
          Sign In
        </button>
      </form>

      <form
        id="forgotPasswordForm"
        autoComplete="off"
        style={{ display: "none" }}
        className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-md border border-sky-100"
      >
        <h2 className="text-2xl font-semibold text-sky-700 mb-4 text-center">Reset Password</h2>
        <input
          type="email"
          name="email"
          id="Forgot_Pass_email"
          required
          placeholder="Account Email"
          className="w-full p-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-300 focus:border-sky-300 outline-none transition"
        />
        <p id="emailError" className="text-red-500 text-sm min-h-5"></p>
        <button
          type="submit"
          id="Send_Reset_Token"
          className="w-full bg-sky-600 text-white p-3 rounded-lg hover:bg-sky-700 transition font-medium"
        >
          Send Reset Token
        </button>
      </form>

      <form
        id="ResetPasswordForm"
        autoComplete="off"
        style={{ display: "none" }}
        className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-md border border-sky-100"
      >
        <h2 className="text-2xl font-semibold text-sky-700 mb-4 text-center">Set New Password</h2>
        <input
          type="text"
          name="Token"
          id="resetToken"
          required
          placeholder="Token"
          className="w-full p-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-300 focus:border-sky-300 outline-none transition"
        />
        <input
          type="password"
          id="New_Password"
          required
          placeholder="New Password"
          className="w-full p-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-300 focus:border-sky-300 outline-none transition"
        />
        <input
          type="password"
          id="New_Password_confirm"
          required
          placeholder="New Password Confirmation"
          className="w-full p-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-300 focus:border-sky-300 outline-none transition"
        />
        <p id="passwordError2" className="text-red-500 text-sm min-h-5"></p>
        <div className="flex gap-4">
          <button
            id="Back2"
            className="flex-1 bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            id="Reset_Password_Button"
            className="flex-1 bg-sky-600 text-white p-3 rounded-lg hover:bg-sky-700 transition font-medium"
          >
            Reset Password
          </button>
        </div>
      </form>

      <div
        id="user"
        style={{ display: "none" }}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-md border border-sky-100 text-center text-sky-700"
      ></div>

      <div className="flex flex-wrap gap-4 justify-center">
        <button
          id="Back"
          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
        >
          Back
        </button>
        <button
          id="forgot_password"
          className="bg-sky-100 text-sky-700 px-6 py-2 rounded-lg hover:bg-sky-200 transition font-medium"
        >
          Forgot Password
        </button>
        <button
          id="sign_out"
          className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default Sign_in;
