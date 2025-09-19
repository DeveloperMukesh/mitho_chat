
"use client";

import { MessageSquare, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActiveTab = 'chats' | 'peoples' | 'settings';

export const BottomNavBar = ({ activeTab, onTabChange }: { activeTab: ActiveTab, onTabChange: (tab: ActiveTab) => void }) => {
    const navItems = [
        { name: 'chats', icon: MessageSquare, label: 'Chats' },
        { name: 'peoples', icon: Users, label: 'Peoples' },
        { name: 'settings', icon: Settings, label: 'Settings' },
    ] as const;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
            <div className="grid h-full grid-cols-3">
                {navItems.map((item) => (
                    <Button 
                        key={item.name} 
                        variant="ghost" 
                        className={cn(
                            "flex flex-col h-full items-center justify-center rounded-none gap-1",
                            activeTab === item.name ? "text-primary bg-primary/10" : "text-muted-foreground"
                        )}
                        onClick={() => onTabChange(item.name)}
                    >
                        <item.icon className="h-6 w-6" />
                        <span className="text-xs">{item.label}</span>
                    </Button>
                ))}
            </div>
        </div>
    )
}
