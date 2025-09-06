import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { registerUser ,loginUser, logoutUser} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router()

// basically we are doing here file handling

// router.route("/test").get(testFunction)

router.route("/register").post(
    // this upload comes from multer
    upload.fields([
        {
            name: "avatar",
            maxCount: 1 // means how many files you want to accept, here it is 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secure routes
router.route("/logout").post(verifyJWT, logoutUser)




export default router