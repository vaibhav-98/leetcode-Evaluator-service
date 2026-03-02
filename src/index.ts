import bodyParser from 'body-parser';
import express from "express"

import serverConfig from "./config/serverConfig";


import { serverAdapter } from "./config/bullBoard";

import apiRouter from "./routes";
import SampleWorker from "./workers/sampleWorker";
//import runPython from './containers/runPythonDocker';
//import runJava from './containers/runJavaDocker';
import runCpp from './containers/runCpp';

//import sampleQueueProducer from "./producers/sampleQueueProducer";



const app = express()

app.use(bodyParser.urlencoded( { extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());

app.use("/api", apiRouter)

// mount bull-board router
app.use("/admin/queues", serverAdapter.getRouter());

app.listen(serverConfig.PORT, () => {
    console.log(`Server started at *:${serverConfig.PORT}`);
    console.log("Bull Board UI: http://localhost:5000/admin/queues");
     SampleWorker('SampleQueue');
 


   const code = ` 
    #include<iostream>
    using namespace std;

    int main () {
     int x;
     cin>>x;
     cout<<"Value of x is "<<x<<" ";
     for(int i =0; i < x; i++ ) {
     cout<<i<< " ";
     }
     cout<<endl;
     return 0;
    }
    `;

    const inputCase = `10`;

 runCpp(code, inputCase);   

//============ this is Java code ==========================//
/*
const code = `
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner src = new Scanner(System.in);
        int input = src.nextInt();
        System.out.println("input value given by user: " + input);
        for (int i = 0; i < input; i++) {
            System.out.println(i);
        }
    }
}
`;

const inputCase = `10`;

runJava(code, inputCase);

*/

     
// ======= this is python code ===================
/*
  const code = `
x = input()
y = input()
print("value of x is", x)
print("value of y is", y)
`;
const inputCase = `100
200`;               
runPython(code, inputCase);
  
*/



//    sampleQueueProducer('SampleJob', {
//     name: "vaibhav",
//     company: "PW",
//     position: "Tech Enginer",
//     location: "Remote | BLR | LKO"
// }, 1);
})