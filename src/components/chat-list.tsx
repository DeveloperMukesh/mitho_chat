
"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chat, User, FriendRequest } from "@/lib/data";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ScrollArea } from "./ui/scroll-area";

export const ChatList = ({ 
  chats,
  selectedChat,
  onSelectChat,
} : {
  chats: Chat[],
  selectedChat: Chat | null,
  onSelectChat: (chat: Chat) => void,
}) => {

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  return (
    <ScrollArea className="h-full">
      <SidebarMenu className="p-2 md:p-0">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                onClick={() => onSelectChat(chat)}
                isActive={selectedChat?.id === chat.id}
                className="h-auto py-2"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{chat.name ? getInitials(chat.name) : 'U'}</AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="font-semibold truncate">
                      {chat.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-xs">
                    <span className="text-muted-foreground">
                      {formatLastMessageTime(chat.lastMessageTimestamp)}
                    </span>
                    {chat.unreadCount > 0 && (
                      <Badge className="mt-1 h-5 w-5 justify-center p-0">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No chats found.
          </div>
        )}
      </SidebarMenu>
    </ScrollArea>
  );
};
