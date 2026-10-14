import { useEffect, useState } from "react";

interface Celebrant {
  id: string;
  display_name: string;
  batch_year: number;
}

export default function CelebrantStrip() {
  const [celebrants, setCelebrants] = useState<Celebrant[]>([]);

  useEffect(() => {
    fetch("/api/celebrants/today")
      .then((res) => res.json())
      .then((data) => {
        if (data.celebrants) {
          setCelebrants(data.celebrants);
        }
      })
      .catch((err) => console.error("Error fetching celebrants:", err));
  }, []);

  if (celebrants.length === 0) return null;

  return (
    <div className="celebrant-strip">
      <p>
        <strong>🎉 Happy Birthday to:</strong>{" "}
        {celebrants.map((c) => c.display_name).join(", ")}
      </p>
    </div>
  );
}
