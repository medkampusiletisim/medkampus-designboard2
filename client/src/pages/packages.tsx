import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

// Confetti Component
const Confetti = () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    initial={{
                        x: "50vw",
                        y: "50vh",
                        scale: 0,
                    }}
                    animate={{
                        x: Math.random() * 100 + "vw",
                        y: Math.random() * 100 + "vh",
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                        scale: [0, 1.5, 1],
                        rotate: Math.random() * 360,
                    }}
                    transition={{
                        duration: Math.random() * 2 + 1,
                        repeat: Infinity,
                        ease: "easeOut",
                    }}
                    style={{
                        left: "-10px",
                        top: "-10px",
                    }}
                />
            ))}
        </div>
    );
};

export default function Packages() {
    const [isOpened, setIsOpened] = useState(false);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        if (!isOpened) {
            const timer = setTimeout(() => {
                setShowHint(true);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isOpened]);

    const variants = {
        shake: {
            rotate: [0, -5, 5, -5, 5, 0],
            scale: [1, 1.05, 1],
            transition: {
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2, // Shake every 2 seconds
            }
        },
        hover: {
            scale: 1.05
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative selection:bg-red-500/30">
            {/* Snowy/Christmas Background Effect (Subtle) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full blur-[1px] animate-pulse" />
                <div className="absolute top-40 right-20 w-3 h-3 bg-white rounded-full blur-[2px] animate-pulse delay-700" />
                <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-white rounded-full blur-[1px] animate-pulse delay-300" />
                <div className="absolute top-1/3 left-1/2 w-1 h-1 bg-white rounded-full blur-[0px] animate-pulse delay-1000" />
            </div>

            <AnimatePresence mode="wait">
                {!isOpened ? (
                    <motion.div
                        key="gift-container"
                        className="flex flex-col items-center relative"
                        exit={{ scale: 0, opacity: 0, transition: { duration: 0.5 } }}
                    >
                        {/* Hint Section */}
                        <AnimatePresence>
                            {showHint && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute -top-32 flex flex-col items-center gap-4 z-20"
                                >
                                    <motion.span
                                        className="text-white text-3xl font-bold tracking-wider drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]"
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        Bana Tıkla
                                    </motion.span>
                                    <motion.div
                                        animate={{ y: [0, 10, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                    >
                                        <Hand className="w-12 h-12 text-white rotate-180 drop-shadow-lg" />
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* The Gift Box */}
                        <motion.div
                            variants={variants}
                            animate="shake"
                            whileHover="hover"
                            onClick={() => setIsOpened(true)}
                            className="relative cursor-pointer w-64 h-64 md:w-80 md:h-80 select-none"
                        >
                            {/* Box Base (Red) */}
                            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 rounded-xl shadow-[0_20px_50px_rgba(255,0,0,0.3)] border-2 border-red-400/30"></div>

                            {/* Horizontal Ribbon (Gold) */}
                            <div className="absolute left-1/2 -translate-x-1/2 h-full w-16 bg-yellow-400 shadow-sm border-x border-orange-500/20"></div>

                            {/* Vertical Ribbon (Gold) */}
                            <div className="absolute top-1/2 -translate-y-1/2 w-full h-16 bg-yellow-400 shadow-sm border-y border-orange-500/20"></div>

                            {/* Lid Shadow */}
                            <div className="absolute top-0 w-full h-10 bg-black/10 blur-md"></div>

                            {/* Top Lid (Slightly larger) */}
                            <div className="absolute -top-8 -left-2 -right-2 h-16 bg-red-700 rounded-lg shadow-lg border-b-4 border-red-900 flex items-center justify-center z-10">
                                <div className="h-full w-16 bg-yellow-400 border-x border-orange-500/20"></div>
                            </div>

                            {/* Bow Tie (Gold) */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-16 z-20">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-yellow-500 rounded-full shadow-inner z-20"></div>
                                <div className="absolute left-0 top-0 w-16 h-16 bg-yellow-400 rounded-full rounded-br-none -rotate-12 shadow-md border-2 border-yellow-200"></div>
                                <div className="absolute right-0 top-0 w-16 h-16 bg-yellow-400 rounded-full rounded-bl-none rotate-12 shadow-md border-2 border-yellow-200"></div>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="message-container"
                        className="text-center z-10 px-4"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5, duration: 1 }}
                    >
                        <Confetti />

                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-8 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]"
                        >
                            İyi Ki Hayatımdasın Çiğdem.
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-3xl md:text-5xl text-white font-serif italic"
                        >
                            Sana Bayılıyorum ❤️
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
