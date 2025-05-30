import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Engine, Body } from "matter-js";
import { UtensilsCrossed } from "lucide-react";

// Food Bowl Component with Matter.js Physics
const FoodBowl = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine>(null);
  const ballsRef = useRef<Body[]>([]);
  const ballIconsRef = useRef<Map<Body, "dog" | "cat">>(new Map());
  const [Matter, setMatter] = useState<typeof import("matter-js")>();
  const [foodGrams, setFoodGrams] = useState(0); // Now storing in grams
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Constants
  const MAX_FOOD_GRAMS = 200; // 100% = 200 grams
  const containerWidth = 320;
  const containerHeight = 600;

  // Helper function to convert grams to percentage
  const gramsToPercentage = (grams: number) => {
    return Math.round((grams / MAX_FOOD_GRAMS) * 100);
  };

  // Helper function to convert percentage to grams
  const percentageToGrams = (percentage: number) => {
    return Math.round((percentage / 100) * MAX_FOOD_GRAMS);
  };

  // Function to parse food level from various formats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseFoodLevel = (data: any) => {
    if (typeof data === "string") {
      // Handle "20 gramas" format
      const gramsMatch = data.match(/(\d+)\s*gramas?/i);
      if (gramsMatch) {
        return parseInt(gramsMatch[1]);
      }

      // Handle plain number as string
      const num = parseInt(data);
      if (!isNaN(num)) {
        // If it's a reasonable gram amount (0-200), treat as grams
        // If it's 0-100, treat as percentage for backward compatibility
        return num <= 100 ? percentageToGrams(num) : num;
      }
    }

    if (typeof data === "number") {
      // If it's a reasonable gram amount (0-200), treat as grams
      // If it's 0-100, treat as percentage for backward compatibility
      return data <= 100 ? percentageToGrams(data) : data;
    }

    return 0;
  };

  // Function to get random pet icon
  const getRandomPetIcon = () => {
    return Math.random() > 0.5 ? "dog" : "cat";
  };

  // Function to draw pet icon on canvas
  const drawPetIcon = (
    ctx: CanvasRenderingContext2D,
    iconType: "dog" | "cat",
    x: number,
    y: number,
    size: number = 16
  ) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Simple text representations of the icons
    const iconChar = iconType === "dog" ? "🐕" : "🐱";
    ctx.fillText(iconChar, x, y);
  };

  useEffect(() => {
    // Dynamically import Matter.js
    const loadMatter = async () => {
      try {
        const MatterModule = await import("matter-js");
        setMatter(MatterModule);
      } catch (error) {
        console.error("Failed to load Matter.js:", error);
      }
    };

    loadMatter();
  }, []);

  useEffect(() => {
    const newSocket = new WebSocket("wss://petsync.onrender.com/");

    newSocket.addEventListener("open", () => {
      console.log("Connected to WebSocket server");
      setSocket(newSocket);
    });

    newSocket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.level !== undefined) {
          const grams = parseFoodLevel(data.level);
          setFoodGrams(Math.min(Math.max(grams, 0), MAX_FOOD_GRAMS));
        }

        if (data.grams !== undefined) {
          const grams = parseFoodLevel(data.grams);
          setFoodGrams(Math.min(Math.max(grams, 0), MAX_FOOD_GRAMS));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    newSocket.addEventListener("close", () => {
      console.log("Disconnected from WebSocket server");
      setSocket(null);
    });

    newSocket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      setSocket(null);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!Matter || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create engine
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 0.8;
    engineRef.current = engine;

    // Create walls
    const walls = [
      // Bottom
      Matter.Bodies.rectangle(
        containerWidth / 2,
        containerHeight - 10,
        containerWidth,
        20,
        {
          isStatic: true,
          render: { fillStyle: "#9CA3AF" },
        }
      ),
      // Left wall
      Matter.Bodies.rectangle(10, containerHeight / 2, 20, containerHeight, {
        isStatic: true,
        render: { fillStyle: "#9CA3AF" },
      }),
      // Right wall
      Matter.Bodies.rectangle(
        containerWidth - 10,
        containerHeight / 2,
        20,
        containerHeight,
        {
          isStatic: true,
          render: { fillStyle: "#9CA3AF" },
        }
      ),
    ];

    Matter.World.add(engine.world, walls);

    // Render function
    const render = () => {
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      // Draw sky background
      const gradient = ctx.createLinearGradient(0, 0, 0, containerHeight);
      gradient.addColorStop(0, "#BAE6FD");
      gradient.addColorStop(1, "#E0F2FE");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, containerWidth, containerHeight);

      // Draw walls
      ctx.fillStyle = "#9CA3AF";
      ctx.fillRect(0, containerHeight - 20, containerWidth, 20); // Bottom
      ctx.fillRect(0, 0, 20, containerHeight); // Left
      ctx.fillRect(containerWidth - 20, 0, 20, containerHeight); // Right

      // Draw food balls
      ballsRef.current.forEach((ball) => {
        ctx.save();
        ctx.translate(ball.position.x, ball.position.y);
        ctx.rotate(ball.angle);

        // Main ball
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, 2 * Math.PI);
        ctx.fillStyle = "#D97706";
        ctx.fill();
        ctx.strokeStyle = "#92400E";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw pet icon instead of highlight
        const iconType = ballIconsRef.current.get(ball) || "dog";
        drawPetIcon(ctx, iconType, 0, 0, 20);

        ctx.restore();
      });

      requestAnimationFrame(render);
    };

    // Start render loop
    render();

    // Start engine
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [Matter]);

  // Update food balls based on food level in grams
  useEffect(() => {
    if (!Matter || !engineRef.current) return;

    // Each ball represents 10 grams (200g / 20 balls max)
    const targetBallCount = Math.floor(foodGrams / 10);
    const currentBallCount = ballsRef.current.length;

    if (targetBallCount > currentBallCount) {
      // Add new balls
      const ballsToAdd = targetBallCount - currentBallCount;
      for (let i = 0; i < ballsToAdd; i++) {
        setTimeout(() => {
          const ball = Matter.Bodies.circle(
            Math.random() * (containerWidth - 60) + 30, // Random x position
            -20, // Start above the container
            24, // Radius
            {
              restitution: 0.6,
              friction: 0.3,
              density: 0.001,
            }
          );

          // Assign random pet icon to this ball
          ballIconsRef.current.set(ball, getRandomPetIcon());

          ballsRef.current.push(ball);
          if (engineRef.current) {
            Matter.World.add(engineRef.current.world, ball);
          }
        }, i * 200); // Stagger the ball drops
      }
    } else if (targetBallCount < currentBallCount) {
      // Remove balls
      const ballsToRemove = currentBallCount - targetBallCount;
      for (let i = 0; i < ballsToRemove; i++) {
        const ballToRemove = ballsRef.current.pop();
        if (ballToRemove) {
          // Clean up the icon mapping
          ballIconsRef.current.delete(ballToRemove);
          Matter.World.remove(engineRef.current.world, ballToRemove);
        }
      }
    }
  }, [foodGrams, Matter]);

  const dispenseFoodHandler = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Send message to fill to maximum (200 grams)
      socket.send(
        JSON.stringify({ action: "fillBowl", grams: MAX_FOOD_GRAMS })
      );
    } else {
      console.warn("WebSocket not connected, cannot dispense food");
      // Fallback: set to maximum food level locally
      setFoodGrams(MAX_FOOD_GRAMS);
    }
  };

  const currentPercentage = gramsToPercentage(foodGrams);

  return (
    <div className="flex flex-col items-center space-y-6 p-6 sm:p-8">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={containerWidth}
          height={containerHeight}
          className="rounded-xl border-4 border-gray-400 shadow-2xl"
          style={{ background: "linear-gradient(to bottom, #BAE6FD, #E0F2FE)" }}
        />

        {/* Container Label */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="bg-white px-4 py-2 rounded-lg text-lg font-bold text-gray-700 shadow-lg border-2 border-gray-300">
            Pote de Ração
          </div>
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border-2 border-gray-300 flex items-center gap-4 min-w-[240px]">
            <Progress value={currentPercentage} className="flex-1" />
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold text-gray-700">
                {foodGrams}g
              </span>
              <span className="text-sm text-gray-500">
                {currentPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dispense Food Button */}
      <Button
        onClick={dispenseFoodHandler}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-8 text-lg flex items-center justify-center shadow-lg"
        size="lg"
      >
        <UtensilsCrossed className="mr-3 h-6 w-6" />
        Encher Pote (200g)
      </Button>
    </div>
  );
};

export default FoodBowl;
