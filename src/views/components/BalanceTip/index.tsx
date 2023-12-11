import React, { useEffect, useState } from "react";
import axios from "axios";
import messageUtil from "@/util/MessageUtil";
import { IconWallet } from "@tabler/icons-react";
import {
  HoverCard,
  Text,
  ActionIcon,
  Group,
  LoadingOverlay,
} from "@mantine/core";

const currencyMap = {
  USD: "$",
  RMB: "¥",
};

function formatBalance(balance: number) {
  return Math.round(balance * 1000) / 1000;
}

function formatCurrency(balance: number, currency: string) {
  return `${currencyMap[currency] || currency}${balance}`;
}

const envMap = {
  dev: {
    requestUrl: "https://apptest.devchat.ai",
    link: "https://webtest.devchat.ai",
  },
  prod: {
    requestUrl: "https://app.devchat.ai",
    link: "https://web.devchat.ai",
  },
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function WechatTip() {
  const [bindWechat, setBindWechat] = useState(false);
  const [balance, setBalance] = useState<null | number>(null);
  const [currency, setCurrency] = useState("USD");
  const [accessKey, setAccessKey] = useState("");
  const [env, setEnv] = useState("prod");
  const [loading, setLoading] = useState(false);
  const platform = process.env.platform;

  const getSettings = () => {
    messageUtil.sendMessage({
      command: "getUserAccessKey",
    });
  };

  const getBalance = () => {
    if (!envMap[env].requestUrl || !accessKey) {
      return;
    }
    setLoading(true);
    axios
      .get(`${envMap[env].requestUrl}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${accessKey}` },
      })
      .then((res) => {
        if (res?.data?.user?.wechat_nickname) {
          setBindWechat(true);
        }
        if (res?.data?.organization?.balance) {
          setBalance(formatBalance(res?.data?.organization?.balance));
          setCurrency(res?.data?.organization?.currency);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (env && accessKey) {
      getBalance();
    }
  }, [env, accessKey]);

  useEffect(() => {
    getSettings();
    messageUtil.registerHandler(
      "getUserAccessKey",
      (message: { endPoint: string; accessKey: string; keyType: string }) => {
        if (message.keyType === "DevChat" && message.accessKey) {
          if (message.endPoint.includes("api-test.devchat.ai")) {
            setEnv("dev");
          } else {
            setEnv("prod");
          }
          setAccessKey(message.accessKey);
        }
      }
    );
  }, []);

  const openLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    messageUtil.sendMessage({
      command: "openLink",
      url: envMap[env].link,
    });
  };

  if (balance === null || balance === undefined) {
    return null;
  }

  return (
    <HoverCard
      shadow="lg"
      position="left"
      width="200"
      withArrow={true}
      styles={{
        arrow: {
          borderColor: "var(--vscode-menu-border)",
        },
      }}
      zIndex={999}
    >
      <HoverCard.Target>
        <div onMouseEnter={getBalance}>
          <ActionIcon size="sm">
            <IconWallet size="1.125rem" />
          </ActionIcon>
        </div>
      </HoverCard.Target>
      <HoverCard.Dropdown
        sx={{
          color: "var(--vscode-foreground)",
          borderColor: "var(--vscode-menu-border)",
          backgroundColor: "var(--vscode-menu-background)",
        }}
      >
        <Group style={{ width: "90%" }}>
          <Text size="sm">
            Your remaining credit is {formatCurrency(balance, currency)}. Sign
            in to{" "}
            {platform === "idea" ? (
              <Text td="underline" c="blue" onClick={(e) => openLink(e)}>
                web.devchat.ai{" "}
              </Text>
            ) : (
              <a href={envMap[env].link} target="_blank">
                web.devchat.ai{" "}
              </a>
            )}
            to {bindWechat ? "purchase more tokens." : "earn additional ¥8"}
          </Text>
          <LoadingOverlay visible={loading} />
        </Group>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
