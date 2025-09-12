import bodyParser from "body-parser";
import getUserByEmail from "../models/auth.js";
import bcrypt from "bcrypt";
const saltRounds = 10;
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));

const loginGetHandler = async (req, res) => {
  const email = req.body.username;
    const loginPassword = req.body.password;
  
    try {
      const result = await getUserByEmail(email);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        //verifying the password
        bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
          if (err) {
            console.error("Error comparing passwords:", err);
          } else {
            if (result) {
              res.render("secrets.ejs");
            } else {
              res.send("Incorrect Password");
            }
          }
        });
      } else {
        res.send("User not found");
      }
    } catch (err) {
      console.log(err);
    }
}