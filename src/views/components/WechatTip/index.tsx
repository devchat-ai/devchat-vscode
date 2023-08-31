import React, { useEffect } from "react";
import axios from "axios";
import messageUtil from "@/util/MessageUtil";

const key =
  "DC.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOjgxODg1ODM1MDgyLCJqdGkiOjcyNjk5NTE1NzkyOTU5ODgzNjB9.s1P6Br4Cw3xki_76bqJ-HRr229Q0WjMQrQ3z7hXTPtk";

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function WechatTip() {
  const getSettings = () => {
    messageUtil.sendMessage({
      command: "getSetting",
      key1: "DevChat",
      key2: "API_ENDPOINT",
    });
  };
  useEffect(() => {
    getSettings();
    messageUtil.registerHandler("getSetting", (message: { value: string }) => {
      console.log("value API_ENDPOINT: ", message);
    });

    axios
      .get("https://apptest.devchat.ai/api/v1/users/profile", {
        headers: { Authorization: `Bearer ${key}` },
      })
      .then((res) => {
        console.log("res: ", res);
      });
  }, []);

  return (
    <div
      style={{
        padding: "10px 15px",
        backgroundColor: "var(--vscode-input-background)",
        position: "absolute",
      }}
    >
      Your remaining credit is ¥1.5. Sign in to{" "}
      <a href="https://test.devchat.ai">devchat.ai </a>to earn additional ¥8.
    </div>
  );
}
