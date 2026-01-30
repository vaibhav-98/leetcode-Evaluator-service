import express from "express"
import { pingCheck } from "../../controllers/pingController"


const v1Route = express.Router()

v1Route.get("/ping", pingCheck)

export default v1Route