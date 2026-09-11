"use client";

import { recordTruckContentView } from "@/lib/trackContentView";
import ProfileGallery from "./ProfileGallery";

type ProfileGalleryProps = React.ComponentProps<typeof ProfileGallery>;

/** Thin client wrapper around ProfileGallery that records a content view when
 * a photo is opened full-size. Needed because a Server Component (the full
 * profile page) can't pass a closure directly to a Client Component prop. */
export default function GalleryWithTracking({
  truckId,
  isOwnerView,
  ...rest
}: Omit<ProfileGalleryProps, "onPhotoOpen"> & { truckId: string; isOwnerView: boolean }) {
  return (
    <ProfileGallery
      {...rest}
      onPhotoOpen={(index) =>
        recordTruckContentView(truckId, "photo", String(index), isOwnerView)
      }
    />
  );
}
