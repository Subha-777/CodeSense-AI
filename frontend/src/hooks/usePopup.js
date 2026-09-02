import { useState } from "react";

export function usePopup() {
  const [popup, setPopup] = useState(null);

  const showPopup = (message, type = "success") => {
    setPopup({ message, type, confirm: false });
  };

  const showConfirm = (message, onConfirm, confirmText = "Delete") => {
    setPopup({ message, type: "confirm", confirm: true, onConfirm, confirmText });
  };

  const closePopup = () => setPopup(null);

  return { popup, showPopup, showConfirm, closePopup };
}