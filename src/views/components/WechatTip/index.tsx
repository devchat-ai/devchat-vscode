import React, { useEffect, useState } from "react";
import axios from "axios";
import messageUtil from "@/util/MessageUtil";
import { IconCoin } from "@tabler/icons-react";
import { HoverCard, Text, ActionIcon, Group } from "@mantine/core";

const currencyMap = {
  USD: "$",
  RMB: "¥",
};

function formatBalance(balance: number) {
  return Math.round(balance * 100) / 100;
}

function formatCurrency(balance: number, currency: string) {
  return `${currencyMap[currency] || currency} ${balance}`;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function WechatTip() {
  const [bindWechat, setBindWechat] = useState(false);
  const [link, setLink] = useState("https://devchat.ai");
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("USD");

  const getSettings = () => {
    messageUtil.sendMessage({
      command: "getUserAccessKey",
    });
  };
  useEffect(() => {
    getSettings();
    messageUtil.registerHandler(
      "getUserAccessKey",
      (message: { endPoint: string; accessKey: string; keyType: string }) => {
        if (message.keyType === "DevChat" && message.accessKey) {
          let url = "https://app.devchat.ai";
          if (message.endPoint.includes("apptest.devchat.ai")) {
            url = "https://apptest.devchat.ai";
            setLink("https://test.devchat.ai");
          }
          axios
            .get(`${url}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer ${message.accessKey}` },
            })
            .then((res) => {
              if (res?.data?.user?.wechat_nickname) {
                setBindWechat(true);
              }
              if (res?.data?.organization?.balance) {
                setBalance(formatBalance(res?.data?.organization?.balance));
                setCurrency(res?.data?.organization?.currency);
              }
            });
        }
      }
    );
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 2,
        right: 5,
        top: 5,
      }}
    >
      <HoverCard width="240">
        <HoverCard.Target>
          <ActionIcon
            color="blue"
            radius="xl"
            variant="filled"
            sx={{
              opacity: 0.5,
              transition: "opacity 300ms ease",
              "&:hover": {
                opacity: 1,
              },
            }}
          >
            <IconCoin />
          </ActionIcon>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Group style={{ width: "90%" }}>
            <Text size="sm">
              Your remaining credit is {formatCurrency(balance, currency)}. Sign
              in to <a href={link}>devchat.ai </a>to{" "}
              {bindWechat ? "purchase more tokens." : "earn additional ¥8"}
            </Text>
          </Group>
        </HoverCard.Dropdown>
      </HoverCard>
    </div>
  );
}
