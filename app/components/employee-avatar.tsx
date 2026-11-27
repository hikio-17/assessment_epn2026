import { getInitials } from "~/lib/format";

type EmployeeAvatarProps = {
  name: string;
  photoUrl: string | null;
  className?: string;
};

export function EmployeeAvatar({
  name,
  photoUrl,
  className = "",
}: EmployeeAvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`grid place-items-center bg-indigo-100 font-semibold text-indigo-700 ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}