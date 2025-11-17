"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Item } from "@/services";

type ItemCardProps = {
  item: Item;
};

const colors = {
  common: {
    bar: "bg-gray-11",
    bg: "bg-gray-2",
    light: "bg-gray-9",
    border: "border-gray-6",
    text: "text-gray-11",
  },
  uncommon: {
    bar: "bg-green-11",
    bg: "bg-green-2",
    light: "bg-green-9",
    border: "border-green-6",
    text: "text-green-11",
  },
  rare: {
    bar: "bg-link-11",
    bg: "bg-link-2",
    light: "bg-link-9",
    border: "border-link-6",
    text: "text-link-11",
  },
  epic: {
    bar: "bg-purple-11",
    bg: "bg-purple-2",
    light: "bg-purple-9",
    border: "border-purple-6",
    text: "text-purple-11",
  },
  legendary: {
    bar: "bg-warning-11",
    bg: "bg-warning-2",
    light: "bg-warning-9",
    border: "border-warning-6",
    text: "text-warning-11",
  },
};

export default function ItemCard({ item }: ItemCardProps) {
  const { t } = useLanguage();

  const rarity = item.rarity?.toLowerCase() || "common";
  const itemColor = colors[rarity as keyof typeof colors];

  return (
    <motion.div
      className={`${itemColor.bg} group flex flex-col justify-between h-[259px] border relative p-4 ${itemColor.border} rounded-lg overflow-hidden transition-colors duration-300 ease-in-out`}
      whileHover={{ y: -8, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)" }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 inset-0 ${itemColor.bar} h-1 w-[60%] rounded-b-xl`}
      />

      <p
        className={`${itemColor.text} text-xs font-medium p-1 px-2 font-sora z-10 mt-1 absolute top-4 left-4 ${itemColor.text} border ${itemColor.border} ${itemColor.bg} rounded`}
      >
        {rarity?.toUpperCase()}
      </p>

      <div className="w-full h-full flex items-center justify-center">
        <Image
          src={item.imageUrl || ""}
          alt={item.name}
          width={1000000000}
          height={1000000000}
          draggable={false}
          className="z-10 w-[50%] h-[50%] object-contain group-hover:-rotate-6 transition-all duration-300 ease-in-out absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />

        <div
          className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-20 h-20 ${itemColor.light} blur-2xl`}
        />
      </div>

      <span className={`${itemColor.text} font-semibold z-10 drop-shadow-md shadow-black text-xs`}>{item.name}</span>
    </motion.div>
  );
}
