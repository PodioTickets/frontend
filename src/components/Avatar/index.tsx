"use client";
import Image from "next/image";
import { AvatarBorderIcon } from "../Icons/AvatarBorderIcon";

type Props = {
  avatar: string;
  color: string;
  borderColor: string;
};

export function Avatar({ avatar, color, borderColor }: Props) {
  return (
    <div className={`relative h-[74px] w-[74px] ${color}`}>
      <AvatarBorderIcon className={`absolute top-0 left-0 h-full w-full`} />
      <div className="h-full w-full rounded-lg overflow-hidden p-2">
        <Image
          src={avatar}
          alt="avatar"
          width={1000}
          height={1000}
          className={`h-full w-full object-cover border-2 rounded-lg ${borderColor}`}
        />
      </div>
    </div>
  );
}
