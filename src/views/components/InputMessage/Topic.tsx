import React, { useEffect, useState } from "react";
import { ActionIcon, Drawer, Text, Box, Flex, Divider } from "@mantine/core";
import { IconClock, IconChevronDown } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import messageUtil from "@/util/MessageUtil";
import dayjs from "dayjs";

export default function Topic({ styleName }) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [topicList, setTopicList] = useState([]);

  useEffect(() => {
    messageUtil.sendMessage({
      command: "listTopics",
    });
    messageUtil.registerHandler("listTopics", (data) => {
      setTopicList(data);
    });
  }, []);

  const showTopic = (root_prompt: any) => {
    closeDrawer();
    messageUtil.sendMessage({
      command: "getTopicDetail",
      topicHash: root_prompt.hash,
    });
  };

  return (
    <>
      <Drawer
        opened={drawerOpened}
        position="bottom"
        title="Devchat Topic"
        onClose={closeDrawer}
        overlayProps={{ opacity: 0.5, blur: 4 }}
        closeButtonProps={{ children: <IconChevronDown size="1rem" /> }}
        styles={{
          content: {
            background: "var(--vscode-sideBar-background)",
            color: "var(--vscode-editor-foreground)",
            overflowY: "auto",
          },
          header: {
            background: "var(--vscode-sideBar-background)",
            color: "var(--vscode-editor-foreground)",
          },
        }}
      >
        {topicList.map((item: any, index) => (
          <Box
            sx={{
              cursor: "pointer",
            }}
            onClick={() => showTopic(item?.root_prompt)}
          >
            <Flex justify="space-between" gap="sm">
              <Text
                fz="sm"
                fw={700}
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                }}
              >
                {item?.root_prompt.title}
              </Text>
              <Text
                fz="sm"
                c="dimmed"
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {dayjs(item?.latest_time * 1000).format("MM-DD HH:mm:ss")}
              </Text>
            </Flex>

            <Text
              c="dimmed"
              fz="sm"
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item?.root_prompt.responses?.[0]}
            </Text>
            {index !== topicList.length - 1 && (
              <Divider variant="solid" my={6} opacity="0.5" />
            )}
          </Box>
        ))}
      </Drawer>
      <ActionIcon
        className={styleName}
        radius="xl"
        variant="default"
        onClick={openDrawer}
      >
        <IconClock size="1rem" />
      </ActionIcon>
    </>
  );
}
