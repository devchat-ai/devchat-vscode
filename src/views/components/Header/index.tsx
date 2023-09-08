import React from "react";
import { Header, Avatar, Flex, Text, ActionIcon } from "@mantine/core";
import BalanceTip from "@/views/components/BalanceTip";
import { IconSettings } from "@tabler/icons-react";
// @ts-ignore
import SvgAvatarDevChat from "../MessageAvatar/avatar_devchat.svg";
import messageUtil from "@/util/MessageUtil";

export default function Head() {
  const openSetting = () => {
    messageUtil.sendMessage({
      command: "doCommand",
      content: ["workbench.action.openSettings", "DevChat"],
    });
  };
  return (
    <Header
      height={40}
      style={{
        backgroundColor: "var(--vscode-sideBar-background)",
        // borderBottom: "1px solid var(--vscode-disabledForeground)",
        boxShadow: "0 0px 3px var(--vscode-widget-shadow)",
      }}
    >
      <Flex justify="space-between" align="center" sx={{ padding: "0 10px" }}>
        <Flex
          gap="sm"
          justify="flex-start"
          align="center"
          style={{
            height: 40,
          }}
        >
          <Avatar color="indigo" size={25} radius="xl" src={SvgAvatarDevChat} />
          <Text weight="bold">DevChat</Text>
        </Flex>
        <Flex align="center" gap="xs" sx={{paddingRight:10}}>
          <div>
            <BalanceTip />
          </div>
          <div>
            <ActionIcon size='sm' onClick={openSetting}>
              <IconSettings size="1.125rem" />
            </ActionIcon>
          </div>
        </Flex>
      </Flex>
    </Header>
  );
}
