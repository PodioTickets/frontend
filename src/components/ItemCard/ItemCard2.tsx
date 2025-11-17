import type { Purchase } from "@/services";
import Image from "next/image";

type Props = { item: Purchase };

const colors = {
  common: {
    bar: "bg-gray-11",
    bg: "bg-gray-2",
    light: "bg-gray-9",
  },
  uncommon: {
    bar: "bg-green-11",
    bg: "bg-green-2",
    light: "bg-green-9",
  },
  rare: {
    bar: "bg-link-11",
    bg: "bg-link-2",
    light: "bg-link-9",
  },
  epic: {
    bar: "bg-purple-11",
    bg: "bg-purple-2",
    light: "bg-purple-9",
  },
  legendary: {
    bar: "bg-warning-11",
    bg: "bg-warning-2",
    light: "bg-warning-9",
  },
};

export function ItemCard2({ item }: Props) {
  const rarity = item.rewards[0]?.item?.rarity?.toLowerCase();
  const itemColor = colors[rarity as keyof typeof colors];

  return (
    <div className="overflow-hidden w-[106px] h-full relative p-[1px] group">
      <div
        className={`absolute top-1/2 -translate-y-1/2 left-0 w-full ${itemColor?.light} group-hover:h-20 transition-all duration-500 ease-in-out h-10 blur-md`}
      />
      <div
        className={`relative p-2 flex flex-col items-center justify-center transition-all duration-200 ease-in-out h-full ${itemColor?.bg}`}
      >
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 inset-0 ${itemColor?.bar} h-1 w-[64px] rounded-b-xl`}
        />
        <div
          className={`absolute -top-14 left-1/2 -translate-x-1/2 w-[80%] ${itemColor?.light} h-32 group-hover:h-36 transition-all duration-500 ease-in-out blur-xl`}
        />
        <Image
          src={item.rewards[0]?.item?.imageUrl}
          alt={item.rewards[0]?.item?.name}
          width={100000}
          height={100000}
          className="object-contain z-10 w-[60%] h-[60%] group-hover:-rotate-6 group-hover:scale-110 transition-all duration-200 ease-in-out mb-5"
          draggable={false}
        />
        <div className="text-gray-12 text-[10px] px-2 font-medium absolute bottom-2 mx-auto w-full text-center truncate">
          {item.rewards[0]?.item?.name}
        </div>
      </div>
    </div>
  );
}
