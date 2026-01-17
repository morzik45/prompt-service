import { createApp } from "./app.js";

const { app } = createApp();
const port = Number(process.env.PORT ?? 8787);

app.listen(port, "0.0.0.0", () => {
  console.log(`Prompt Manager server listening on 0.0.0.0:${port}`);
});
