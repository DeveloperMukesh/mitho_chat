
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import Image from "next/image"

export function ImageViewDialog({ imageUrl, onOpenChange }: { imageUrl: string, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 bg-transparent border-0 max-w-4xl w-full h-auto">
        <Image 
            src={imageUrl} 
            alt="Profile picture" 
            width={1024} 
            height={1024} 
            className="rounded-lg object-contain w-full h-full"
        />
      </DialogContent>
    </Dialog>
  )
}
