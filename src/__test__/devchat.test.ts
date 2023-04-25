import DevChat from "../devchat";

describe("DevChat", () => {
  const devChat = new DevChat();

  test("some test", () => {
    const xx = 20;
    expect(xx)
  })

  test("chat should return a valid response", async () => {
    const chatResponse = await devChat.chat("Help me with TypeScript");

    expect(chatResponse).toHaveProperty("prompt-hash");
    expect(chatResponse).toHaveProperty("user");
    expect(chatResponse).toHaveProperty("date");
    expect(chatResponse).toHaveProperty("response");
    expect(chatResponse).toHaveProperty("isError");

    expect(chatResponse.isError).toBe(false);
    expect(chatResponse.response.length).toBeGreaterThan(0);
  });

  test("log should return an array of log entries", async () => {
    const logEntries = await devChat.log({ maxCount: 5 });

    expect(Array.isArray(logEntries)).toBe(true);
    expect(logEntries.length).toBeLessThanOrEqual(5);

    logEntries.forEach((entry) => {
      expect(entry).toHaveProperty("prompt-hash");
      expect(entry).toHaveProperty("user");
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("message");
      expect(entry).toHaveProperty("response");
    });
  });
});
