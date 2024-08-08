// Import dotenv and configure it
// require('dotenv').config();

// server creation and db connection
const express = require('express');
const mysql = require('mysql');

// allows us to control the app's cross origin resource sharing
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const app = express();
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(cors());


// Long polling endpoint
app.get('/currentNumber', (req, res) => {
  res.json({ currentNumber });
});

const generateJWTSecret = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_';
  const length = 64;
  let jwtSecret = '';
  
  for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      jwtSecret += characters[randomIndex];
  }
  
  return jwtSecret;
};

const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";
;

function generateResetToken(email, code) {
  const secret = JWT_SECRET;
  const token = jwt.sign({ user: email, code }, secret, { expiresIn: '1h' }); // Token expires in 1 hour
  return token;
}

// Function to decode and verify JWT token
function verifyResetToken(token) {
  const secret = JWT_SECRET;
  try {
    const decoded = jwt.verify(token, secret);
    return decoded; // Returns decoded object { email, code }
  } catch (error) {
    return null; // Token verification failed
  }
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mariqueuena@gmail.com',
    pass: 'yiykbbiftvqxwfjy'
  }
});

const storage = multer.diskStorage({
  destination: (req, file, db) => {
    db(null, 'public/images')
  },
  filename: (req, file, db) => {
    // Access values.idType from the request body
    const idType = req.body.idType;
    // Generate the filename using idType and current timestamp
    const filename = idType + "_" + Date.now() + path.extname(file.originalname);

    db(null, filename);
  }
})

const upload = multer({ storage: storage }); // Configure Multer with the storage option


app.get('/', (re, res) => {
  return res.json("from backend");
})

// db connection
// const db = mysql.createPool({
//   host: "0.tcp.ap.ngrok.io",
//   port: 17126,
//   user: "root",
//   password: "",
//   database: 'mariqueuena'
// })

// db connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: 'mariqueuena'
})

app.post('/login', async (req, res) => {
  const sql = "SELECT * FROM users_table WHERE `email` = ?";
  const values = [req.body.email];

  db.query(sql, values, async (err, data) => {
    if (err) {
      return res.json("Login Failed");
    }

    console.log("Data retrieved3:", data);
    if (data.length > 0) {
      const storedHashedPassword = data[0].password.trim();

      const passwordMatch = await bcryptjs.compare(req.body.password.trim(), storedHashedPassword.trim());

      if (passwordMatch) {
        return res.json("Success");
      } else {
        return res.json("Failed");
      }
    } else {
      return res.json("Failed");
    }

  });
});

app.post('/users', async (req, res) => {
  const email = req.body.email;
  const sql = "SELECT * FROM users_table WHERE email = ? AND role = 'admin'";
  
  db.query(sql, [email], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    // Assuming the user information is returned as an array with the first user being the logged-in user
    console.log('Data from the database:', data);
    const isAdmin = data.length > 0; // Check if any users with the admin role were found
    return res.json({ isAdmin: isAdmin }); // Send the isAdmin status in the response
  });
});

app.get('/getInQueue', async (req, res) => {
  try {
    const inQueue = req.query.inQueue === '1' ? 1 : 0;
    const sql = "SELECT queueNumber, email FROM users_table WHERE inQueue = ?";
    const data = await new Promise((resolve, reject) => {
      db.query(sql, [inQueue], (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    });

    console.log('Number of users in queue:', data.length);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getQueueNumbers', async (req, res) => {
  try {
    const sql = "SELECT queueNumber FROM users_table";
    const data = await new Promise((resolve, reject) => {
      db.query(sql, (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/resetQueue', async (req, res) => {
  // const updateSql = "UPDATE users_table SET inQueue = 0, queueNumber = 0";
  const updateSql = "UPDATE users_table SET queueNumber = 0";

  db.query(updateSql, (updateErr, updateResult) => {
    if (updateErr) {
      console.error(updateErr);
      console.log("Update result: " + updateResult);
      return res.status(500).json({ error: 'Failed to update queueNumber' });
    }

    return res.json({ message: 'Success' });
  })
});

app.post('/removeQueue', async (req, res) => {
  const queueNumber = req.body.queueNumber;
  // const updateSql = "UPDATE users_table SET inQueue = 0, queueNumber = 0 WHERE queueNumber = ?";
  const updateSql = "UPDATE users_table SET inQueue = 0 WHERE queueNumber = ?";

  db.query(updateSql, [queueNumber], (updateErr, updateResult) => {
    if (updateErr) {
      console.error(updateErr);
      console.log("Update result: " + updateResult);
      return res.status(500).json({ error: 'Failed to update inQueue status' });
    }

    return res.json({ message: 'Success' });
  })
});


app.get('/verify-user', async (req, res) => {
  const sql = "SELECT * FROM users_table WHERE isVerified = 0";

  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Format the dateofbirth field in each user object
    data.forEach(user => {
      const birthDate = new Date(user.dateofbirth);
      const formattedDate = `${birthDate.getFullYear()}-${('0' + (birthDate.getDate())).slice(-2)}-${('0' + (birthDate.getMonth() + 1)).slice(-2)}`;
      user.dateofbirth = formattedDate;
    });
    console.log("users_table: " + data);
    // Send the formatted data as response
    res.json(data);
  });
});

app.post('/get-ids', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }

  const sql = "SELECT * FROM id_table WHERE id IN (?)";

  db.query(sql, [ids], (err, data) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    console.log("id_table: " + data);
    res.json(data); // Send the user data back to the client
  });
});

function getUserIDFilePath(userId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT filepath FROM id_table WHERE id = ?';
    db.query(sql, [userId], (err, result) => {
      if (err) {
        console.error('Error fetching filepath from database:', err);
        reject(err); // Reject the promise with the error
      } else {
        if (result.length > 0) {
          const filePath = result[0].filepath; // Access the filepath from the result
          resolve(filePath); // Resolve the promise with the filepath
        } else {
          reject(new Error('User ID not found')); // Reject the promise if user ID not found
        }
      }
    });
  });
}

app.get('/download-id/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Retrieve the filepath asynchronously
    const filePath = await getUserIDFilePath(userId);

    // Send the file as a response
    res.download(filePath, `id_${userId}.png`, (err) => {
      if (err) {
        // Handle error if file cannot be downloaded
        console.error('Error downloading ID document:', err);
        res.status(500).json({ error: 'Failed to download ID document' });
      }
    });
  } catch (error) {
    // Handle error if filepath retrieval fails
    console.error('Error retrieving ID document filepath:', error);
    res.status(500).json({ error: 'Failed to retrieve ID document filepath' });
  }
});

app.post('/setVerify/:userId', async (req, res) => {
  const userId = req.params.userId;
  const updateSql = "UPDATE users_table SET isVerified = 1 WHERE id = ?";

  db.query(updateSql, [userId], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    // If the update is successful, send a success response
    res.status(200).json({ message: 'Success' });
  });
});


app.post('/checkQueueStatus', async (req, res) => {
  const selectSql = "SELECT * FROM users_table WHERE email = ?";
  const email = req.body.email;

  db.query(selectSql, [email], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    // Check if user with provided email exists
    if (data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = data[0];
    console.log("Check Queue Data: " + user.inQueue);

    if (user.inQueue == 1) {
      // User is already in the queue
      return res.json({ message: "Already in Queue", queueNumber: user.queueNumber});
    } else {
      return res.json({ message: "Not in Queue" });
    }
  });
});

app.post('/addQueue', async (req, res) => {
  const email = req.body.email;
  const number = req.body.number;

    // Increment the queue number
  const incrementedNumber = number + 1;

  const updateSql = "UPDATE users_table SET inQueue = 1, queueNumber = ? WHERE email = ?";

  console.log("Email: " + email);

  // Update the user's inQueue status and queueNumber
  db.query(updateSql, [incrementedNumber, email], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ error: 'Internal Server Error' });
    }
    
    const fetchSql = "SELECT queueNumber FROM users_table WHERE email = ?";
    db.query(fetchSql, [email], (fetchErr, fetchResult) => {
      if (fetchErr) {
        console.error(fetchErr);
        return res.json({ error: 'Internal Server Error' });
      }

      //const updatedQueueNumber = fetchResult[0].queueNumber;
      
    });
    res.json({ message: "Success", queueNumber: incrementedNumber });
  });
});


// app.post('/addQueue', async (req,res) => {
//   const selectSql = "SELECT * FROM users_table WHERE email = ?";
//   const updateQueueSql = "UPDATE users_table SET inQueue = 1 WHERE email = ?";
//   const updateNumberSql = "UPDATE users_table SET queueNumber = ? WHERE email = ?";
//   const email = req.body.email;
//   const number = req.body.number;

//   console.log("Email: " + email);

//   db.query(selectSql, [email], (err, data) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ error: 'Internal Server Error' });
//     }
//     // Check if user with provided email exists
//     if (data.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const user = data[0];

//     if (user.inQueue == 1) {
//       // User is already in the queue
//       return res.json({ message: "Already in Queue" });
//     }

//     // Update the user's inQueue status to 1
//     db.query(updateQueueSql, [email], (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.json({ error: 'Internal Server Error' });
//       }
//     });

//     db.query(updateNumberSql, [number, email], (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.json({ error: 'Internal Server Error' });
//       }
//       console.log("QueueNumber updated for user: " + email);
//       res.json({ message: "Success" });
//     });

//   });
// });

app.post('/upload', upload.single('idImage'), (req, res) => {
  console.log("upload ", req.file);
  const generatedFilename = req.file.filename;

  // Get the email of the user based on the provided user_id
  const userEmail = req.body.email;

  // Insert into id_table with user_email
  const query = "INSERT INTO id_table (user_email, idType, idNumber, filename, filepath) VALUES (?, ?, ?, ?, ?)";
  const uploadValues = [userEmail, req.body.idType, req.body.idNumber, generatedFilename, req.file.path];

  db.query(query, uploadValues, (uploadErr, uploadData) => {
    if (uploadErr) {
      console.error(uploadErr);
      return res.json(uploadErr);
    }

    return res.json(uploadData);
  });
});

app.get('/get-id', (req, res) => {
  const userEmail = req.body.email;

  // Query to fetch the ID information for the user
  const query = "SELECT * FROM id_table WHERE user_email = ?";

  db.query(query, [userEmail], (err, data) => {
    if (err) {
      console.error("Error fetching ID:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'ID not found for the user' });
    }

    // Assuming there is only one ID per user, you can directly send the first ID data
    const idData = data[0];
    const idDownloadLink = idData.filepath; // Adjust this based on your file storage logic

    // Send the ID download link in the response
    return res.json({ downloadLink: idDownloadLink });
  });
});


app.post('/registrationPage', async (req, res) => {
  try {
    // Check if the email already exists in the database
    const checkEmailQuery = "SELECT * FROM users_table WHERE `email` = ?";
    const checkEmailValues = [req.body.email];

    db.query(checkEmailQuery, checkEmailValues, async (checkEmailErr, checkEmailData) => {
      if (checkEmailErr) {
        console.error(checkEmailErr);
        return res.json(checkEmailErr);
      }

      if (checkEmailData.length > 0) {
        // Email already exists, return an error
        return res.json({ error: "Email is already registered" });
      }

      // If the email is not registered, proceed with registration
      const hashedPassword = await bcryptjs.hash(req.body.password, 10);
      const query = 'INSERT INTO users_table (fname, minitial, lname, dateofbirth, mnumber, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const registrationValues = [req.body.fName,req.body.mInitial, req.body.lName, req.body.dateOfBirth, req.body.mNumber, req.body.email, hashedPassword];
      console.log(registrationValues);

      db.query(query, registrationValues, (registrationErr, registrationData) => {
        if (registrationErr) {
          console.error(registrationErr);
          return res.json(registrationErr);
        }

        return res.json(registrationData);
      });
    });
  } catch (error) {
    console.error(error);
    return res.json(error);
  }
});

app.post("/forgot-password", async (req, res) => {
  const sql = "SELECT * FROM users_table WHERE `email` = ?";
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const email = req.body.email;

  try {
    db.query(sql, email, async (err, data) => {
      if (err) {
        return res.json("Error occurred while querying the database");
      } else {
        const user = data.length > 0 ? data[0] : null;
        if (!user) {
          return res.json("Email doesn't exist");
        } else {
        
          // Generate JWT token for password reset
          const token = jwt.sign({ user: email, randomCode }, JWT_SECRET, { expiresIn: '1h' });
          console.log("Forgot: " + token);

          // Send email with the reset password code and token
          const mailOptions = {
            from: 'mariqueuena@gmail.com',
            to: req.body.email,
            subject: 'Password Reset Code',
            text: `Your password reset code is: ${randomCode}`,
            html: `<p>Your password reset code is: <strong>${randomCode}</strong></p>`
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.json("Error sending email");
            } else {
              console.log('Email sent:', info.response);
              return res.json("Success");
            }
          });

          return res.json({ message: "Success", token }); // Return the JWT token to the client
        }

      }
    });
  } catch (error) {
    console.error(error);
    return res.json("An error occurred while processing your request");
  }
});

app.post('/verify-code', (req, res) => {

  const { token, code} = req.body;

  console.log("Token: " + token);
  // Verify the token and extract the code from it
  const decodedToken = verifyResetToken(token);
  console.log("Decoded Token: " + decodedToken);

  if (!decodedToken) {
    return res.json({ error: "Invalid or expired token" });
  }

  // Extract code from decoded token
  const tokenCode = decodedToken.randomCode;
  const email = decodedToken.user;
  console.log("Token Code: " + tokenCode);
  console.log("Entered Code: " + code);

  if (code == tokenCode) {
    return res.json({ message: "Success", email });
  } else {
    return res.json({ error: "Invalid code" });
  }

});

app.post('/reset-password', async (req, res) => {

  try {
    const hashedPassword = await bcryptjs.hash(req.body.password, 10);
    const sql = "UPDATE users_table SET `password` = ? WHERE `email` = ?";
    db.query(sql, [hashedPassword, req.body.email], async (err, data) => {
      if (err) {
        console.log("Password: " + req.body.password);
        console.log("Email: " + req.body.email);
        return res.status(500).json({ error: "Error occurred while updating the password" });
      }
      
      return res.json({ message: "Password reset successful" });
    });
  } catch (error) {
    console.error(error);
    console.log("Password: " + req.body.password);
    console.log("Email: " + req.body.email);
    return res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

const server = app.listen(3031, () => {
    console.log('Server is running on port 3031');
}); 