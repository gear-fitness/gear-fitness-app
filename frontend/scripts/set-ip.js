const { networkInterfaces } = require("os");
const fs = require("fs");

const nets = networkInterfaces();
let ip = "localhost";

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === "IPv4" && !net.internal) {
      ip = net.address;
      break;
    }
  }
  if (ip !== "localhost") break;
}

const envPath = ".env";
let env = fs.readFileSync(envPath, "utf-8");
env = env.replace(
  /EXPO_PUBLIC_API_URL=.*/,
  `EXPO_PUBLIC_API_URL=http://${ip}:8080`,
);
fs.writeFileSync(envPath, env);

console.log(`Set API URL to http://${ip}:8080`);
