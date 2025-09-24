import CourseSearch from "../components/CourseSearch"

function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-sky-800 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Plan Your Academic Week</h1>
            <p className="text-xl md:text-2xl mb-8 text-sky-100">
              Create your perfect schedule and organize your finals week with ease
            </p>

          </div>
        </div>

      </div>

      {/* Course Search Section */}
      <div className="mx-auto px-4 py-8 ">
        <div className="max-w-4xl mx-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Find Your Courses</h2>
            <CourseSearch />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
