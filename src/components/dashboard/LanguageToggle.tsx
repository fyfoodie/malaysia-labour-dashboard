import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="relative flex items-center w-16 h-8 rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors overflow-hidden"
      aria-label="Toggle language"
    >
      <motion.div
        className="absolute w-7 h-6 rounded-full bg-primary shadow-sm"
        animate={{ x: lang === "en" ? 3 : 33 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      />
      <span className={`relative z-10 flex-1 text-center text-xs font-bold transition-colors ${lang === "en" ? "text-primary-foreground" : "text-muted-foreground"}`}>
        EN
      </span>
      <span className={`relative z-10 flex-1 text-center text-xs font-bold transition-colors ${lang === "bm" ? "text-primary-foreground" : "text-muted-foreground"}`}>
        BM
      </span>
    </button>
  );
};

export default LanguageToggle;
