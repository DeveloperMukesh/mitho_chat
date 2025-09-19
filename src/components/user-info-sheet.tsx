
"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/lib/data";
import { useIsMobile } from "@/hooks/use-mobile";

export function UserInfoSheet({ user, open, onOpenChange, onViewImage }: { user: User, open: boolean, onOpenChange: (open: boolean) => void, onViewImage: (imageUrl: string) => void }) {
  const isMobile = useIsMobile();
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const content = (
    <div className="flex flex-col items-center text-center p-6 gap-4">
        <button onClick={() => onViewImage(user.photoURL)}>
            <Avatar className="h-32 w-32">
                <AvatarImage src={user.photoURL} alt={user.displayName} />
                <AvatarFallback className="text-4xl">{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
        </button>
        <div>
            <h2 className="text-2xl font-bold font-headline">{user.displayName}</h2>
            <p className="text-muted-foreground">@{user.handle}</p>
        </div>
    </div>
  );

  if (isMobile) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle className="sr-only">User Information</DialogTitle>
                {content}
            </DialogContent>
        </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Contact Info</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
