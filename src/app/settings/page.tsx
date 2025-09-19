
"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { doc, updateDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db, storage, auth } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Palette, Monitor, Sun, Moon, Camera, Music, Volume2 } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageViewDialog } from "@/components/image-view-dialog";

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  handle: z.string().min(3, { message: "Handle must be at least 3 characters." }).max(20).regex(/^[a-zA-Z0-9_]+$/, { message: "Handle can only contain letters, numbers, and underscores." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const colors = [
    { name: 'Default', hsl: '356 79% 56%' },
    { name: 'Orange', hsl: '24 93% 54%' },
    { name: 'Rose', hsl: '346 89% 60%' },
    { name: 'Green', hsl: '142 71% 45%' },
    { name: 'Blue', hsl: '221 83% 53%' },
    { name: 'Yellow', hsl: '48 96% 53%' },
    { name: 'Violet', hsl: '262 84% 59%' },
];

const ringtones = [
    { name: 'Default', file: '/sounds/incoming-call.mp3'},
    { name: 'Chime', file: '/sounds/chime.mp3'},
    { name: 'Signal', file: '/sounds/signal.mp3'},
    { name: 'Uplift', file: '/sounds/uplift.mp3'},
];


export default function SettingsPage() {
  const { user, loading, userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingTheme, setIsSavingTheme] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const ringtoneInputRef = React.useRef<HTMLInputElement>(null);
  const [viewedImage, setViewedImage] = React.useState<string | null>(null);
  const [isUploadingRingtone, setIsUploadingRingtone] = React.useState(false);
  const [playingRingtone, setPlayingRingtone] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      handle: "",
    },
  });

  const handleFieldValue = form.watch("handle");
  const debouncedHandle = useDebounce(handleFieldValue, 500);
  const [isCheckingHandle, setIsCheckingHandle] = React.useState(false);
  const [isHandleAvailable, setIsHandleAvailable] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  React.useEffect(() => {
    if(userProfile) {
      form.reset({
        displayName: userProfile.displayName || "",
        handle: userProfile.handle || ''
      });
      if(userProfile.theme?.primaryColor) {
        document.body.style.setProperty('--primary', userProfile.theme.primaryColor);
      }
    }
  }, [userProfile, form]);

  React.useEffect(() => {
    const checkHandle = async () => {
        if (!debouncedHandle || !user) return;
        if (debouncedHandle.length < 3) {
            setIsHandleAvailable(null);
            return;
        }
        if (debouncedHandle === userProfile?.handle) {
          setIsHandleAvailable(true);
          return;
        }

        setIsCheckingHandle(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("handle", "==", debouncedHandle));
            const querySnapshot = await getDocs(q);
            setIsHandleAvailable(querySnapshot.empty);
        } catch (error) {
            console.error("Error checking handle:", error);
            setIsHandleAvailable(false);
        } finally {
            setIsCheckingHandle(false);
        }
    };
    checkHandle();
  }, [debouncedHandle, user, userProfile?.handle]);


  async function onSubmit(data: ProfileFormValues) {
    if (!user || !auth.currentUser) return;

    if (!isHandleAvailable) {
        toast({
            title: "Handle not available",
            description: "Please choose a different handle.",
            variant: "destructive",
        });
        return;
    }
    
    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      
      await updateProfile(auth.currentUser, { displayName: data.displayName });
      
      await updateDoc(userRef, {
        displayName: data.displayName,
        handle: data.handle,
      });

      await refreshUserProfile();
      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleAvatarClick = () => {
      avatarInputRef.current?.click();
  }

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !auth.currentUser) return;

    setIsUploading(true);

    const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
    
    try {
        await uploadBytes(storageRef, file);
        const photoURL = await getDownloadURL(storageRef);

        await updateProfile(auth.currentUser, { photoURL });
        
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { photoURL });
        
        await refreshUserProfile();

        toast({ title: "Avatar updated successfully!" });

    } catch (error) {
        console.error("Error uploading avatar:", error);
        toast({ title: "Error uploading image", description: "Please try again.", variant: 'destructive'});
    } finally {
        setIsUploading(false);
    }
  }

    const handleRingtoneFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingRingtone(true);
    const ringtoneRef = ref(storage, `ringtones/${user.uid}/custom_ringtone`);
    
    try {
        await uploadBytes(ringtoneRef, file);
        const ringtoneURL = await getDownloadURL(ringtoneRef);
        
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { 'theme.ringtoneUrl': ringtoneURL });
        
        await refreshUserProfile();
        toast({ title: "Custom ringtone uploaded!" });

    } catch (error) {
        console.error("Error uploading ringtone:", error);
        toast({ title: "Error uploading ringtone", description: "Please try again.", variant: 'destructive'});
    } finally {
        setIsUploadingRingtone(false);
    }
  }


  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system', newColor?: string) => {
    if (!user) return;
    setIsSavingTheme(true);
    
    const currentPrimary = userProfile?.theme?.primaryColor || '356 79% 56%';
    const primaryColor = newColor || currentPrimary;

    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            'theme.mode': newTheme,
            'theme.primaryColor': primaryColor
        });

        if (newTheme !== 'system') {
           setTheme(newTheme);
        } else {
            setTheme('system');
        }

        if(newColor) {
            document.body.style.setProperty('--primary', primaryColor);
        }
        await refreshUserProfile();
        toast({ title: "Theme updated!"});

    } catch (error) {
        console.error("Error updating theme:", error);
        toast({ title: "Error updating theme", variant: 'destructive'})
    } finally {
        setIsSavingTheme(false);
    }
  }

  const handleRingtoneChange = async (ringtoneFile: string) => {
      if (!user) return;
      try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
              'theme.ringtoneUrl': ringtoneFile
          });
          playRingtone(ringtoneFile);
          await refreshUserProfile();
      } catch (error) {
          console.error("Error updating ringtone:", error);
          toast({ title: "Error updating ringtone", variant: 'destructive' });
      }
  };

  const playRingtone = (file: string | null) => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    if (file) {
        const audio = new Audio(file);
        audio.play();
        audioRef.current = audio;
        setPlayingRingtone(file);
        audio.onended = () => setPlayingRingtone(null);
    } else {
        setPlayingRingtone(null);
    }
  };

  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="flex min-h-screen w-full items-start justify-center bg-background p-4 md:items-center">
      <Card className="w-full max-w-2xl relative">
         <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4">
                <ArrowLeft />
            </Button>
         </Link>
        <CardHeader className="text-center pt-12 items-center">
            <div className="relative group">
                <button onClick={() => setViewedImage(userProfile?.photoURL || null)} className="rounded-full">
                    <Avatar className="h-24 w-24" key={userProfile?.photoURL}>
                        <AvatarImage src={userProfile?.photoURL || ''} alt={userProfile?.handle || ''} />
                        <AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback>
                    </Avatar>
                </button>
                <button 
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-white"/> :<Camera className="h-6 w-6 text-white"/>}
                </button>
                <input type="file" ref={avatarInputRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden"/>
            </div>
          <CardTitle className="font-headline">Account Settings</CardTitle>
          <CardDescription>Manage your profile and app appearance.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unique Handle</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your_handle" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is your unique identifier on Mitho Chat.
                    </FormDescription>
                    <div className="h-4">
                      {isCheckingHandle ? (
                         <p className="text-sm text-muted-foreground flex items-center gap-2">
                           <Loader2 className="h-4 w-4 animate-spin"/> Checking availability...
                         </p>
                      ) : (
                        debouncedHandle && debouncedHandle.length > 2 && isHandleAvailable !== null ? (
                            isHandleAvailable ? (
                                <p className="text-sm text-green-600">Handle is available!</p>
                            ) : (
                                <p className="text-sm text-destructive">Handle is already taken.</p>
                            )
                        ) : null
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSaving || isCheckingHandle || !isHandleAvailable}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile Changes
              </Button>
            </form>
          </Form>

          <Separator className="my-8" />
            
          <div className="space-y-4">
              <h3 className="text-lg font-medium font-headline">Appearance</h3>
              <div className="space-y-2">
                <Label>Theme Mode</Label>
                 <RadioGroup
                    defaultValue={userProfile?.theme?.mode || 'system'}
                    onValueChange={(value: 'light' | 'dark' | 'system') => handleThemeChange(value)}
                    className="grid grid-cols-3 gap-4"
                    disabled={isSavingTheme}
                 >
                    <Label className="border cursor-pointer rounded-lg p-4 flex flex-col items-center justify-center gap-2 [&:has(:checked)]:border-primary">
                        <Sun className="h-6 w-6"/>
                        <span>Light</span>
                        <RadioGroupItem value="light" className="sr-only" />
                    </Label>
                    <Label className="border cursor-pointer rounded-lg p-4 flex flex-col items-center justify-center gap-2 [&:has(:checked)]:border-primary">
                        <Moon className="h-6 w-6"/>
                        <span>Dark</span>
                        <RadioGroupItem value="dark" className="sr-only" />
                    </Label>
                    <Label className="border cursor-pointer rounded-lg p-4 flex flex-col items-center justify-center gap-2 [&:has(:checked)]:border-primary">
                        <Monitor className="h-6 w-6"/>
                        <span>System</span>
                        <RadioGroupItem value="system" className="sr-only" />
                    </Label>
                 </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                 <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {colors.map(c => (
                        <Button 
                            key={c.name}
                            variant="outline"
                            size="icon"
                            onClick={() => handleThemeChange(userProfile?.theme?.mode || theme || 'system', c.hsl)}
                            className={cn("h-12 w-12 rounded-full",
                                userProfile?.theme?.primaryColor === c.hsl && "border-2 border-primary"
                            )}
                            style={{backgroundColor: `hsl(${c.hsl})`}}
                            disabled={isSavingTheme}
                        >
                            {userProfile?.theme?.primaryColor === c.hsl && <div className="h-4 w-4 rounded-full bg-primary-foreground" />}
                             <span className="sr-only">{c.name}</span>
                        </Button>
                    ))}
                 </div>
              </div>
              {isSavingTheme && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Applying theme...</p>}
          </div>

          <Separator className="my-8" />
          
          <div className="space-y-4">
              <h3 className="text-lg font-medium font-headline">Notifications & Sounds</h3>
               <RadioGroup
                  value={userProfile?.theme?.ringtoneUrl || '/sounds/incoming-call.mp3'}
                  onValueChange={handleRingtoneChange}
                  className="space-y-2"
                >
                  {ringtones.map(tone => (
                    <div key={tone.file} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3">
                            <RadioGroupItem value={tone.file} id={tone.file} />
                            <Label htmlFor={tone.file} className="font-normal">{tone.name}</Label>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => playRingtone(playingRingtone === tone.file ? null : tone.file)}
                        >
                            <Volume2 className="h-5 w-5" />
                        </Button>
                    </div>
                  ))}
                  {userProfile?.theme?.ringtoneUrl && !ringtones.some(t => t.file === userProfile?.theme?.ringtoneUrl) && (
                       <div className="flex items-center justify-between rounded-md border p-3 bg-secondary">
                        <div className="flex items-center gap-3">
                            <RadioGroupItem value={userProfile.theme.ringtoneUrl} id="custom" />
                            <Label htmlFor="custom" className="font-normal">Custom</Label>
                        </div>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => playRingtone(playingRingtone === userProfile.theme?.ringtoneUrl ? null : userProfile.theme.ringtoneUrl)}
                        >
                            <Volume2 className="h-5 w-5" />
                        </Button>
                    </div>
                  )}
              </RadioGroup>
              <Button variant="outline" className="w-full" onClick={() => ringtoneInputRef.current?.click()} disabled={isUploadingRingtone}>
                  {isUploadingRingtone ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Music className="mr-2 h-4 w-4" />}
                  Upload Custom Ringtone
              </Button>
               <input type="file" ref={ringtoneInputRef} onChange={handleRingtoneFileChange} accept="audio/*" className="hidden"/>

          </div>

        </CardContent>
      </Card>
    </div>
    {viewedImage && <ImageViewDialog imageUrl={viewedImage} onOpenChange={() => setViewedImage(null)} />}
    </>
  );
}

    