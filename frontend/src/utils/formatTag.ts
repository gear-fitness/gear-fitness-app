export const formatTag = (tag: string) => {
  return tag
    .toLowerCase()
    .split("_")
    .map((word) => {
      if (word === "db") return "DB";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};
