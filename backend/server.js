
import 'dotenv/config';
import express from "express"
import bodyParser from "body-parser"
import pg from "pg";
import cors from "cors";
import jwt from "jsonwebtoken";
import pdf from "pdf-parse-new";
import axios from "axios";
import bcrypt from "bcrypt";
import multer from "multer";
import { from as copyFrom } from 'pg-copy-streams';  
import { parse } from 'csv-parse';
import fs from "fs";
import sgMail from '@sendgrid/mail';
const upload  = multer({ dest: "uploads/" });
const {Pool} = pg;


sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Set the API key for SendGrid
const app = express();
const PORT = process.env.PORT || 8080;
//Change Variables
const startDate = "August 28, 2025";
const endDate = "December 6, 2025";

const apiKey = process.env.GEMINI_API_KEY;

//Middleware to parse http request
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Replace these with your actual values


const ux = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
  ssl: false,      // ← no TLS here; proxy handles it
  max: 25,
});
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN;
// A separate secret for refresh tokens
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN;



ux.connect();
const refreshTokens = {};

//**************************************************************************/
function generateAccessToken(user) {
    // In a real app, sign with user ID or email
    const {UserID, UserRole, Email} = user; // Destructure email and role from user object
    
    const payload  = {
        id: UserID, // Assuming you have a user ID field in your user object
        role: UserRole, // Assuming you have a role field in your user object
        email: Email, // Assuming you have an email field in your user object
    };
    return jwt.sign(
      payload,
      ACCESS_TOKEN_SECRET,
      { expiresIn: "30m" }  // example 15-minute expiry
    );
}

//**************************************************************************/
function parseTime(timeStr) {
    // Remove any spaces and convert to lowercase
    timeStr = timeStr.replace(/\s+/g, '').toLowerCase(); 
    
    // Determine whether it's "am" or "pm" and remove that part from the string
    let period = "";
    if (timeStr.endsWith("am")) {
      period = "am";
      timeStr = timeStr.slice(0, -2);
    } else if (timeStr.endsWith("pm")) {
      period = "pm";
      timeStr = timeStr.slice(0, -2);
    }
    
    // Split the remaining string by colon to separate hours and minutes
    const parts = timeStr.split(":");
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    
    // Adjust for 'pm' (unless it's 12pm) and for 12am which should be 0 hours
    if (period === "pm" && hours !== 12) {
      hours += 12;
    }
    if (period === "am" && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
}

//**************************************************************************/
function parseMeetingTime(meetingStr) {
  // strip spaces & lowercase
  const clean = meetingStr.replace(/\s+/g, "").toLowerCase();
  const [rawStart, rawEnd] = clean.split("-");
  // grab the period from the end (am/pm)
  const periodMatch = rawEnd.match(/am|pm$/);
  const period = periodMatch ? periodMatch[0] : "";
  // ensure both sides carry the period
  const startStr = rawStart.match(/am|pm$/) ? rawStart : rawStart + period;
  const endStr   = rawEnd;
  return {
    start: parseTime(startStr),
    end:   parseTime(endStr)
  };
}

//**************************************************************************/
function parseTimeforFinals(meetingStr) {
  // strip spaces & lowercase
  const clean = meetingStr.replace(/\s+/g, "").toLowerCase(); 
  const [rawStart, rawEnd] = clean.split("-");
  // grab the period from the end (am/pm)
  const periodMatch = rawEnd.match(/am|pm$/);
  const period = periodMatch ? periodMatch[0] : "";
  // ensure both sides carry the period
  const startStr = rawStart.match(/am|pm$/) ? rawStart : rawStart + period;
  const endStr   = rawEnd;
  return {
    start: startStr,
    end:   endStr
  };
}
//**************************************************************************/
function generateRefreshToken(user) {
    // Generate referesh token
    const {UserID, UserRole, Email} = user;
    
    const payload  = {
        id: UserID, 
        role: UserRole, 
        email: Email,
    };

    return jwt.sign(
      payload,
      REFRESH_TOKEN_SECRET,
      { expiresIn: "30m" }
    );
}
//**************************************************************************/
async function getCourses () {
    const rc = await ux.query("SELECT * FROM courses ORDER BY id ASC")
    return rc.rows;
}

//**************************************************************************/
async function getDepartment(dept) {
  let rc  = '';
  if (dept === 'Computing and Mathematics') {
    rc = 'CM'
  } else if (dept === 'Behavioral Sciences') {
    rc = 'BEH'
  } else if (dept === 'Business (Graduate)') {
    rc = 'GBUS'
  } else if (dept === 'Biology and Chemistry') {
    rc = 'BC'
  } else if (dept === 'Business (Undergraduate)') {
    rc = 'BUS'
  } else if (dept === 'Communication & Public Affairs') {
    rc = 'CPA'
  } else if (dept === 'Education (Graduate)') {
    rc = 'GEDU'
  } else if (dept === 'Education (Undergraduate)') {
    rc = 'EDU'
  } else if (dept === 'Engineering') {
    rc = 'EGR'
  } else if (dept === 'Graduate School of Counseling') {
    rc = 'GCSL'
  } else if (dept === 'Health, Leisure/Sport Sciences') {
    rc = 'HLSS'
  } else if (dept === 'Honors') {
    rc = 'HONR'
  } else if (dept === 'Liberal Arts') {
    rc = 'LBA'
  } else if (dept === 'Nursing (Graduate)') {
    rc = 'GNUR'
  } else if (dept === 'Nursing (Undergraduate)') {
    rc = 'NUR'
  } else if (dept === 'Theology & Ministry (Graduate)') {
    rc = 'GTHE'
  } else if (dept === 'Worship/Media/Performing Arts') {
    rc = 'WMP'
  }
  
  

  return rc;
}
//**************************************************************************/
async function getDeptCourses (department) {
    const rc = await ux.query(
      `SELECT course_id, "Title", "Subject", "Course" ,"Meeting_Time", 
      "Classroom", "Primary_Instructor", "Department", "Days"
      FROM courses WHERE "Department" = $1`, 
      [department]);

      return rc.rows;
}
//**************************************************************************/
async function getUsers (email) {
    const rc =  await ux.query('SELECT * FROM users WHERE "Email" = $1', [email]);
    return rc.rows;
}

//**************************************************************************/
function pullCourseCalendar(fullText) {
  // Create a regular expression to capture everything between 
  // "course calendar" and "latest revision", case-insensitive.
  // [\s\S]*? matches any character (including line breaks) in a non-greedy way.
  const regex = /course calendar([\s\S]*?)primary program/i;
  const match = regex.exec(fullText);
  
  if (match) {
    // match[1] contains the text between the phrases
    return match[1].trim();
  } else {
    console.warn("Could not extract the course calendar section from the text.");
    return null;
  }
}

//**************************************************************************/
async function parsePDF (url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer", // gets the raw binary
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/pdf",
      },
    });

    const buffer = Buffer.from(response.data, "binary");
    const parsed = await pdf(buffer);
    
    const calendarSection = await pullCourseCalendar(parsed.text);
    
    
    return calendarSection; 
  } catch (error) {
    console.error("❌ Failed to extract PDF text:", error.message);
    return null;
  }
}

//**************************************************************************/
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  // If there's no Authorization header or it doesn’t start with "Bearer ",
  //    we immediately respond 401 Unauthorized
  if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

  // Grab the token part ("Bearer <token>")
  const token = authHeader.split(' ')[1];

  // Verify the token. If it fails, respond 403 Forbidden.
  jwt.verify(token, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    //On success, attach the decoded payload to req.user
    req.user = user;

    //and call next() to hand off control to the next middleware or route handler
    next();
  });
}


//**************************************************************************/
app.get("/api/courses", async (req, res) => {    
    const courses = await getCourses();
    res.send({
        courses: courses,
    });
});  

//**************************************************************************/
app.get("/api/courses/department", authenticateJWT, async (req, res) => {
    const { department } = req.query; //Get the department from the query string    
    const courses = await getDeptCourses(department);
    
    res.send({
        courses: courses,
    });
});

//**************************************************************************/
app.get("/api/userSchedule", authenticateJWT, async (req, res) => {
    const { userId } = req.query; // Get userId from query parameters
    
  
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
  
    try {
    // Join the courses table with your schedule 
    // table to retrieve course details for the user.
      const result = await ux.query(
        `
        SELECT c.*
        FROM courses c
        JOIN schedule s ON c.course_id = s.course_id
        WHERE s.user_id = $1
        ORDER BY c."Title" ASC
        `,
        [userId]
      );
  
      // Return the list of courses as "courses" in the JSON response
      return res.json({ courses: result.rows });
    } catch (error) {
      console.error("Error fetching user schedule:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

//**************************************************************************/
// GET endpoint for live course search
app.get("/api/courses/search", async (req, res) => {
  const { q } = req.query;

  // Empty query 
  if (!q || !q.trim()) {
    return res.json({ courses: [] });
  }

  // Normalize: trim and collapse any extra spaces to a single space
  const normalizedQuery = `%${q.trim().replace(/\s+/g, " ")}%`;

  try {
    const sql = `
      SELECT
        course_id,
        "Title",
        "Subject",
        "Department",
        "Days",
        "Course",
        "Meeting_Time",
        "Classroom",
        "Primary_Instructor"
      FROM courses
      WHERE
        -- title match
        "Title" ILIKE $1
        OR
        -- code match, but only with a single space between Subject & Course
        ( "Subject" || ' ' || "Course" ) ILIKE $1
      ORDER BY "Title" ASC
      LIMIT 50
    `;

    const { rows } = await ux.query(sql, [normalizedQuery]);
    return res.json({ courses: rows });
  } catch (err) {
    console.error("Error searching courses:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//**************************************************************************/
app.post("/api/addCourseToSchedule", async (req, res) => {
    try {
      const { userId, courseId } = req.body;
      if (!userId || !courseId) {
        return res.status(400).json({ error: "userId and courseId are required"});
      }
      
      //Retrieve the new course's schedule details
      const courseQuery = `
        SELECT "Days" AS day,
        "Meeting_Time" AS meetingTime
        FROM courses
        WHERE course_id = $1
        `;
    
      const courseResult = await ux.query(courseQuery, [courseId]);
      if (courseResult.rowCount === 0) {
        return res.status(404).json({ error: "Course not found" });
      }
      const newCourse = courseResult.rows[0];
      
      
      
      
      //Retrieve the user's current schedule with course timings.
      // Here we assume your schedule table (named "schedule") joins with courses to retrieve schedule information.
      const { rows: currentCourses } = await ux.query(
        `
        SELECT c."Days"   AS day,
              c."Meeting_Time" AS meetingTime
        FROM schedule s
        JOIN courses c ON s.course_id = c.course_id
        WHERE s.user_id = $1
      `
        , [userId]);
      
      // parse the new course’s meeting time once
      const { start: newStart, end: newEnd } = parseMeetingTime(newCourse.meetingtime);

      for (const sch of currentCourses) {
        if (sch.day === newCourse.day) {
          
          const { start: schStart, end: schEnd } = parseMeetingTime(sch.meetingtime);
            
          // overlap if newStart < schEnd AND newEnd > schStart
          if (newStart < schEnd && newEnd > schStart) {
            return res.status(409).json({
              error: "Time conflict: This course conflicts with an already scheduled course.",
              conflict: true
            });
          }
        }
      }
      
      //No time conflict was found, so insert the new schedule record.
      const insertQuery = `
        INSERT INTO schedule (user_id, course_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, course_id) DO NOTHING
        RETURNING *;
      `;
      const result = await ux.query(insertQuery, [userId, courseId]);
      
      if (result.rowCount === 0) {
        // If no row inserted, the course is already added.
        return res.status(409).json({
          error: "Course already added to schedule.",
          alreadyAdded: true,
        });
      }
      
      res.json({
        message: "Course added to schedule successfully.",
        alreadyAdded: false,
        schedule: result.rows[0],
      });
    } catch (err) {
      console.error("Error adding course to schedule:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

//**************************************************************************/
app.post("/api/schedule/final-time", (req, res) => {
    const {subject, meetingTime, days, classroom, course} = req.body;
    
    const code = subject + " " + course;
    const location = classroom;
    const {start, end} = parseTimeforFinals(meetingTime);
    const starttime = start;
    const endtime = end;
    const day = days.trim();
    
    
    
    let finalTime = {};

    // Example logic: "final time" is just the endtime for now
    // Replace with your actual algorithm (e.g., last class date, exam time)

    //SATURDAY FINAL
    if (code === "BUS 202") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Saturday April 26, 2025", Location:"GC 2114"};

    // MONDAY FINALS
    } else if (code === "FRE 101" || code === "FRE 203" || code === "FRE 305") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"GC 4112"};
    } else if (code === "SPA 203" || code === "SPA 204") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"GC 4A37"};
    } else if (code === "SPA 101") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"GC 2114"};
    } else if (code === "SPA 102") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"GC 5116"};
    } else if (code === "ARA 101" || code === "ARA 204") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"GC 2A07"};
    } else if (code === "CHI 101" || code === "CHI 102" || code === "CHI 204" || code === "CHI 302" || code === "CHI 451") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"LRC 232B"};
    } else if (code === "HEB 101" || code === "HEB 102" || code === "HEB 204" || code === "HEB 305") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Monday April 28, 2025", Location:"GC 4A47"};
    } else if (code === "COM 101"){
        finalTime = {fStartT:"2:30pm",fEndT:"4:30pm", Date:"Monday April 28, 2025", Location: location};
    } else if (day === "M W F" && starttime === "9:50am") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Monday April 28, 2025", Location: location};
    } else if (day === "T R" && starttime === "1:00pm") {
        finalTime = {fStartT:"12:10pm",fEndT:"2:10pm", Date:"Monday April 28, 2025", Location: location};
    } else if (day === "M W F" && starttime === "4:45pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Monday April 28, 2025", Location: location};

    //TUESDAY FINALS
    } else if (day === "M W F" && starttime === "8:40am") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Tuesday April 29, 2025", Location: location};
    } else if (day === "T R" && starttime === "10:40am") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Tuesday April 29, 2025", Location: location};
    } else if (day === "M W F" && starttime === "1:15pm") {
        finalTime = {fStartT:"12:10pm",fEndT:"2:10pm", Date:"Tuesday April 29, 2025", Location: location};
    } else if (day === "T R" && starttime === "4:10pm") {
        finalTime = {fStartT:"2:30pm",fEndT:"4:30pm", Date:"Tuesday April 29, 2025", Location: location};
    } else if (day === "M, W ,F" && starttime === "7:15pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Tuesday April 29, 2025", Location: location};
    }

    //WEDNESDAY FINALS
    else if (day === "M W F" && starttime === "7:30am") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Wednesday April 30, 2025", Location: location};
    } else if (day === "T R" && starttime === "9:05am") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Wednesday April 30, 2025", Location: location};
    } else if (day === "M W F" && starttime === "2:25pm") {
        finalTime = {fStartT:"12:10pm",fEndT:"2:10pm", Date:"Wednesday April 30, 2025", Location: location};
    } else if (day === "T R" && starttime === "2:35pm") {
        finalTime = {fStartT:"2:30pm",fEndT:"4:30pm", Date:"Wednesday April 30, 2025", Location: location};
    } else if (day === "M W F" && starttime === "3:35pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Wednesday April 30, 2025", Location: location};
    }

    //THURSDAY FINALS
    else if (day === "T R" && starttime === "7:30am") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Thursday May 1, 2025", Location: location};
    } else if (day === "T R" && starttime === "7:15pm") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Thursday May 1, 2025", Location: location};
    }

    // FRIDAY FINAL
    else if (day === "S") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Friday May 2, 2025", Location: location};
    }

    //CORNER CASES (M W F)
    else if ((day === "M" || day === "F" || day === "W") && starttime === "9:50am") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Monday April 28, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "4:45pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Monday April 28, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "8:40am") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Tuesday April 29, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "1:15pm") {
        finalTime = {fStartT:"12:10pm",fEndT:"2:10pm", Date:"Tuesday April 29, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "7:15pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Tuesday April 29, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "7:30am") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Wednesday April 30, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "2:25pm") {
        finalTime = {fStartT:"12:10pm",fEndT:"2:10pm", Date:"Wednesday April 30, 2025", Location: location};
    } else if ((day === "M" || day === "F" || day === "W") && starttime === "3:35pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Wednesday April 30, 2025", Location: location};
    }

    // CORNER CASES (T R)
    else if ((day === "T" || day === "R") && starttime === "1:00pm") {
        finalTime = {fStartT:"12:10pm",fEndT:"2:10pm", Date:"Monday April 28, 2025", Location: location};
    } else if ((day === "T" || day === "R") && starttime === "10:40am") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Tuesday April 29, 2025", Location: location};
    } else if ((day === "T" || day === "R") && starttime === "4:10pm") {
        finalTime = {fStartT:"2:30pm",fEndT:"4:30pm", Date:"Tuesday April 29, 2025", Location: location};
    } else if ((day === "T" || day === "R") && starttime === "9:05am") {
        finalTime = {fStartT:"9:50am",fEndT:"11:50am", Date:"Wednesday April 30, 2025", Location: location};
    } else if ((day === "T" || day === "R") && starttime === "2:35pm") {
        finalTime = {fStartT:"2:30pm",fEndT:"4:30pm", Date:"Wednesday April 30, 2025", Location: location};
    } else if ((day === "T" || day === "R") && starttime === "7:30am") {
        finalTime = {fStartT:"7:30am",fEndT:"9:30am", Date:"Thursday May 1, 2025", Location: location};
    } else if ((day === "T" || day === "R") && starttime === "7:15pm") {
        finalTime = {fStartT:"4:50pm",fEndT:"6:50pm", Date:"Thursday May 1, 2025", Location: location};

    // All classes meeting at later than 7:15pm take exam at regular scheduled class times
    //Course Time is not accounted for in the regular Finals Schedule.
    } else {
        finalTime = {fStartT:starttime,fEndT:endtime, Date:'Check with Professor', Location: location}
    }

    
    res.send({ finalTime });
  });

//**************************************************************************/

app.post("/users/tokens/sign_up", async (req, res) => {
    const { email, password, firstName, lastName, department } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    // Hash Password
    const hash = await bcrypt.hash(password, 10);
    try {
        await ux.query(
        'INSERT INTO users ("Email", "Password", "FirstName", "LastName", "Department", "UserRole") VALUES ($1, $2, $3, $4, $5, \'user\')',
        [email, hash, firstName, lastName, department]
    );
    } catch (error) {
        return res.status(409).json({ error: "User already exists." });
    }
    

    const newUser = await getUsers(email);
    
    // Generate tokens
    const token = generateAccessToken(newUser[0]);
    const refreshToken = generateRefreshToken(newUser[0]);
  
    // Save refresh token in memory
    refreshTokens[refreshToken] = newUser[0].Email;
    
    // Return tokens + user info
    return res.json({
      token,
      refresh_token: refreshToken,
      resource_owner: {
        id: newUser[0].UserID,
        email: newUser[0].Email,
        firstName: newUser[0].FirstName,
        lastName: newUser[0].LastName,
        Department: newUser[0].Department,
      },
    });
  });
//**************************************************************************/  

app.post("/users/tokens/sign_in", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Fetch user(s) from your DB
    const userArray = await getUsers(email); // returns [] if none found

    // If no user with that email, 404
    if (!Array.isArray(userArray) || userArray.length === 0) {
      return res.status(404).json({ error: "Seems like you're new here, try signing up!" });
    }

    // We have at least one match
    const user = userArray[0];

    //Compare password (in prod, use bcrypt.compare)
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password." });
    }

    //Generate tokens
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //Store refresh token
    refreshTokens[refreshToken] = user.Email;

    //Send response
    return res.json({
      token,
      refresh_token: refreshToken,
      resource_owner: {
        id: user.UserID,
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
        Department: user.Department,
      },
    });

  } catch (err) {
    console.error("Error during sign-in:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});


//**************************************************************************/  
app.post("/users/tokens/refresh", async (req, res) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ error: "No refresh token provided" });
    }
    
    const token = authHeader.split(" ")[1]; // after "Bearer "
  
    if (!refreshTokens[token]) {
      return res.status(403).json({ error: "Refresh token not recognized" });
    }
  
    jwt.verify(token, REFRESH_TOKEN_SECRET, async (err, payload) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired refresh token" });
      }
  
      // Token is valid, so let's get the user
      const email = refreshTokens[token];// We stored user.Email keyed by the token
      const userArray = await getUsers(email);
      if (!userArray || userArray.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = userArray[0];
  
      // Remove old token from store
      delete refreshTokens[token];
  
      // Generate new tokens
      const newRefreshToken = generateRefreshToken(user);
      // Store new refresh token
      refreshTokens[newRefreshToken] = user.Email;
  
      const newAccessToken = generateAccessToken(user);
  
      return res.json({
        token: newAccessToken,
        refresh_token: newRefreshToken,
        resource_owner: {
          id: user.UserID,  
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          Department: user.Department,
        },
      });
    });
});

//**************************************************************************/ 
app.delete("/api/removeCourse", (req, res) => {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) {
      return res.status(400).json({ error: "userId and courseId are required" });
    }

    ux.query(
      `DELETE FROM schedule WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId],
      (err, result) => {
        if (err) {
          console.error("Error removing course from schedule:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Course not found in schedule" });
        }
        res.json({ message: "Course removed from schedule successfully" });
      }
    );
})


//**************************************************************************/
app.get("/pages/restricted", (req, res) => {
    // Look for Authorization: Bearer <access_token>
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }
  
    const token = authHeader.split(" ")[1]; // after "Bearer "
    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, payload) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired access token" });
      }
      // If valid, we can proceed
      return res.json({ message: "You have access to the restricted page!" });
    });
});


app.put("/api/updateUser", async (req, res) => {

  try {
    const { firstName, lastName, email, Department, id } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !Department) {
      return res
        .status(400)
        .json({ error: 'firstName, lastName, email, and Department are all required.' });
    }

    //  Update query
    const updateQuery = `
      UPDATE users
      SET
        "FirstName"  = $1,
        "LastName"   = $2,
        "Email"      = $3,
        "Department" = $4
      WHERE "UserID" = $5
      RETURNING
        "UserID"    AS id,
        "FirstName" AS firstName,
        "LastName"  AS lastName,
        "Email"     AS email,
        "Department";
    `;
    const { rows } = await ux.query(updateQuery, [
      firstName,
      lastName,
      email,
      Department,
      id,
    ]);

    // If no rows were updated, the user didn't exist
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    //Send back the updated user
    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  
})

//**************************************************************************/
app.get("/api/prepPlan", authenticateJWT, async (req, res) => {
  const { userId } = req.query;
  const courseCalendar = {};

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const result = await ux.query(
      `
      SELECT c."Title", c."Department", c."syllabus_id"
      FROM courses c
      JOIN schedule s ON c.course_id = s.course_id
      WHERE s.user_id = $1
      ORDER BY c."Title" ASC
      `,
      [userId]
    );

    const userSchedule = result.rows;
    const rc = await ux.query('SELECT "Term" FROM courses WHERE course_id = 1');
    const termCode = rc.rows[0].Term;

    // Process PDFs concurrently
    await Promise.all(userSchedule.map(async (course) => {
      try {
        const department = await getDepartment(course.Department);
        const id = course.syllabus_id;
        if (id) {
          const url = `https://syllabi.oru.edu/?term=${termCode}&dept=${department}&id=${id}`;
          const pdfText = await parsePDF(url);
          courseCalendar[course.Title] = pdfText || "PDF parsing failed";
        }
      } catch (error) {
        console.error(`Error processing ${course.Title}:`, error);
        courseCalendar[course.Title] = "Error fetching syllabus";
      }
    }));

    let promptText = `
You are a parser that extracts course calendars from raw syllabus text and outputs structured JSON only.

Instructions:
1. Input: one or more course sections in plain text. Each section begins with a heading line in the form:
   COURSE_CODE - COURSE_TITLE

2. Boilerplate removal: ignore any line (case‑insensitive) that:
   • contains “latest revision”
   • contains “©”
   • contains “all rights reserved”
   • consists solely of digits

3. Calendar header: ignore any line containing both the words “week” and “topic”.

4. Week entries: for each remaining line starting with “Week <number>” or “<number>”:
   a. Discard the week number.
   b. Extract everything after that number (stripping any dash or colon) as the “title” field.

5. Topic filtering:
   • Ignore any entry whose title (case‑insensitive) includes “exam”, “final exam”, or “presentation”.
   • For entries containing “assignment”: remove the word “assignment” (and any leading punctuation or whitespace) and treat the remainder as the topic. Include it only if that topic has not been extracted already. Set the “title” to this extracted topic text (without the word “assignment”).

6. Topic grouping & context generation:
   a. **Group related topics**: cluster topics that share key terms or have a clear prerequisite relationship.
      - For each group of 2+ related topics, generate a single combined context:
      '''
        "Try studying <Topic A> and <Topic B> together, as they relate in <brief link>."
        '''
      - Keep this combined context under 20 words.
   b. **Individual topics**: for any topic not in a group, generate a concise hint (≤ 15 words) of the form:
        '''
        "Understanding <Topic> will help with <Related Concept>."
        '''
   c. If no obvious related concept exists, fall back to:
        '''
        "This topic is key for final‑exam preparation."
        '''
   d. **Enforce date range**: for each combined or individual topic, set its "date" field to the study window string startDate - EndDate (This window should be a 5-day difference) for that topic, making sure the window lies entirely within the inclusive range from ${startDate} to ${endDate}.    
    

7. Course object schema:
   {
     "course_title": string|null,
     "topics": [ { "title": string, "date":string, "context": string } … ] | null,
     "note": string|null
   }
  
   IMPORTANT!!!
8. If a course has no valid topics after filtering, set '"topics": null' and include the note:
   '"No calendar found; please refer to your D2L shell for details."'

9. Output: a single JSON array of these course objects. Use double quotes, no trailing commas, and do not output any other text.

Now parse the following input and output **only** the JSON:

<SYLLABUS_TEXT>
    `;

    for (const [course, calendar] of Object.entries(courseCalendar)) {
      promptText += `Course: ${course}\n${calendar}\n\n`;
    }

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const content = response.data['candidates'][0]['content']['parts'][0]['text'];

    // Remove any leading/trailing whitespace and code block markers
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json/, "").trim();
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.replace(/```$/, "").trim();
    }

    let prepPlan;
    try {
      prepPlan = JSON.parse(jsonContent);
    } catch (e) {
      // If JSON parsing fails, log the error and return a 500 response
      console.error("Invalid JSON from Gemini:", e);
      return res.status(500).json({ error: "Invalid response from model" });
    }

    return res.json(prepPlan);

  } catch (error) {
    console.error("Error fetching user schedule:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
 
//**************************************************************************/
app.post("/users/tokens/admin-sign_in", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Fetch user(s) from your DB
    const userArray = await getUsers(email); // returns [] if none found

    // If no user with that email, 404
    if (!Array.isArray(userArray) || userArray.length === 0) {
      return res.status(404).json({ error: "Seems like you're new here, try signing up!" });
    }

    // We have at least one match
    const user = userArray[0];

    // Compare password (in prod, use bcrypt.compare)
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password." });
    }

    if (user.UserRole !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Generate tokens
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    refreshTokens[refreshToken] = user.Email;

    // Send response
    return res.json({
      token,
      refresh_token: refreshToken,
      resource_owner: {
        id: user.UserID,
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
        Department: user.Department,
      },
    });

  } catch (err) {
    console.error("Error during sign-in:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});


const EXPECTED_HEADERS = [
  'CRN','Term','Department','Subject','Course','Section','Title','Schedule_Type',
  'Grade_Mode','Special_Permission_To_Enroll','Part_Of_Term','Credit_Hours',
  'Billing_Hours','Viewable_On_Vision','Max_Enrollment','Classroom_Capacity',
  'Enrolled','Registration_Complete','Virtual_Only','Start_Date','End_Date','Days',
  'Meeting_Time','Classroom','Meeting_Time_Instructor','Primary_Instructor',
  'Course_fees','Prerequisites','Corequisites','Crosslisted_Sections','RES_DEPT',
  'RES_FIELD_OF_STUDY','RES_CLASS','RES_LEVEL','RES_DEGREE','RES_PROGRAM',
  'RES_CAMPUS','RES_COLLEGE','RES_STUDENT_ATTRIBUTES','RES_COHORT'
];
/* helper – reads just the first row */
function readHeader(filePath) {
  return new Promise((resolve, reject) => {
    const parser = parse({ to_line: 1, trim: true });
    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', row => {
        // remove BOM if present
        if (row[0]) row[0] = row[0].replace(/^\uFEFF/, '');
        resolve(row);
      })
      .on('error', reject);
  });
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Upload a CSV in field 'file'." });
  }

  const tempPath = req.file.path;
  const client   = await ux.connect(); // pull a dedicated client

  try {
    // validate + log columns 
    const header = await readHeader(tempPath);
    console.log('Uploaded CSV columns →', header);

    if (
      header.length !== EXPECTED_HEADERS.length ||
      !EXPECTED_HEADERS.every((h, i) => h === header[i])
    ) {
      throw new Error(`CSV must have headers: ${EXPECTED_HEADERS.join(', ')}`);
    }

    // Refresh the tables
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE courses, schedule, course_structure
      RESTART IDENTITY CASCADE
    `);

    // Copy data into staging table
    await new Promise((resolve, reject) => {
      const stream = client.query(copyFrom(`
        COPY course_structure(
          "CRN","Term","Department","Subject","Course","Section","Title","Schedule_Type",
          "Grade_Mode","Special_Permission_To_Enroll","Part_Of_Term","Credit_Hours",
          "Billing_Hours","Viewable_On_Vision","Max_Enrollment","Classroom_Capacity",
          "Enrolled","Registration_Complete","Virtual_Only","Start_Date","End_Date",
          "Days","Meeting_Time","Classroom","Meeting_Time_Instructor","Primary_Instructor",
          "Course_fees","Prerequisites","Corequisites","Crosslisted_Sections","RES_DEPT",
          "RES_FIELD_OF_STUDY","RES_CLASS","RES_LEVEL","RES_DEGREE","RES_PROGRAM",
          "RES_CAMPUS","RES_COLLEGE","RES_STUDENT_ATTRIBUTES","RES_COHORT"
        )
        FROM STDIN WITH (FORMAT csv, HEADER true)
      `));

      fs.createReadStream(tempPath)
        .pipe(stream)
        .on('finish', resolve)
        .on('error', reject);
    });

    // Promote into courses
    await client.query(`
      INSERT INTO courses SELECT * FROM course_structure;
    `);

    // Clear staging & commit
    await client.query('TRUNCATE course_structure');
    await client.query('COMMIT');

    res.json({ message: 'Courses and schedules reset successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Upload sync error →', err.message);
    res.status(400).json({ error: err.message || 'Failed to process CSV.' });
  } finally {
    fs.unlink(tempPath, () => {}); // async delete, ignore errors
    client.release();
  }
});


app.post("/passwords/forgot", async (req, res) => {
  console.log("🔥 /passwords/forgot HIT");
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Check if the user exists
    const result = await ux.query(
      'SELECT "Email" FROM users WHERE "Email" = $1',
      [email]
    );

    if (result.rowCount === 0) {
      console.log("Email not found:", email);
      return res.status(404).json({ message: "Email not found." });
    }

    // Generate a 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store the code and expiration in the database
    await ux.query(
      'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE "Email" = $3',
      [resetCode, expiresAt, email]
    );

    // Send the code via email using SendGrid
    const msg = {
      to: email,
      from: 'diyelolu@oru.edu', // Use your verified sender email
      subject: 'Your Password Reset Code',
      text: `Your password reset code is: ${resetCode}
              It expires in 10 minutes.`,
      html: `<p>Your password reset code is: <strong>${resetCode}</strong></p>
             <p>It expires in 10 minutes.</p>`,
    };

    await sgMail.send(msg);
    console.log("📧 Reset code sent to:", email);

    return res.status(200).json({ message: "Reset code sent to email." });

  } catch (error) {
    console.error("Error during password reset request:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


app.post("/passwords/reset", async (req, res) => {
  const { password, token } = req.body;

  if (!password || !token) {
    return res.status(400).json({ message: "Password and token are required." });
  }

  console.log(token);
  

  try {
    // Look for a matching token that hasn't expired
    const result = await ux.query(
      `SELECT "Email" FROM users 
       WHERE reset_code = $1 AND reset_code_expires > NOW()`,
      [token.trim()]
    );
    console.log(result.rows);
    
    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const userEmail = result.rows[0].Email;

    // Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset_code + reset_code_expires
    await ux.query(
      `UPDATE users 
       SET "Password" = $1, reset_code = NULL, reset_code_expires = NULL 
       WHERE "Email" = $2`,
      [hashedPassword, userEmail]
    );

    console.log("✅ Password reset successful for:", userEmail);
    return res.status(200).json({ message: "Password has been reset successfully." });

  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


