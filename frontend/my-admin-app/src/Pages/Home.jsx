"use client"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import axios from "axios"

function Home() {
    const [file, setFile] = useState(null)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const fileInputRef = useRef(null)
  
    const handleFileChange = (e) => {
      setError("")
      setSuccess("")
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) return
  
      if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
        setError("Please select a CSV file only")
        setFile(null)
        e.target.value = ""
        return
      }
  
      setFile(selectedFile)
    }
  
    const handleRemoveFile = () => {
      setFile(null)
      setError("")
      setSuccess("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  
    const uploadFile = () => {
      if (!file) return
  
      setError("")
      setSuccess("")
  
      const formData = new FormData()
      formData.append("file", file)
  
      axios
        .post("http://localhost:8080/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => {
          setSuccess(response.data.message || "Upload succeeded!")
          setFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ""
        })
        .catch((err) => {
          console.error("Error uploading file:", err)
          setError(
            err.response?.data?.error ||
              "There was a problem updating the courses."
          )
        })
    }
  
    return (
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Update Courses</h1>
          <p className="text-gray-600 mt-2">Upload a CSV file to update course information</p>
        </header>
  
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span>
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
            </div>
  
            {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
            {success && <div className="text-sm text-green-600 font-medium">{success}</div>}
  
            {file && (
              <div className="flex items-center gap-2 text-sm">
                <span>
                  Selected file: <span className="font-medium">{file.name}</span>
                </span>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label="Remove selected file"
                  title="Remove selected file"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
  
            <button
              disabled={!file}
              className={`px-4 py-2 rounded-md text-white font-medium mt-2 ${
                file
                  ? "cursor-pointer bg-sky-800 hover:bg-sky-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              onClick={uploadFile}
            >
              Upload CSV
            </button>
          </div>
        </div>
      </div>
    )
}


export default Home