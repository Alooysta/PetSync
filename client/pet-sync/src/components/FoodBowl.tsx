import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Engine, Body } from "matter-js";
import { UtensilsCrossed } from "lucide-react";

// Food Bowl Component with Matter.js Physics
const FoodBowl = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine>(null);
  const ballsRef = useRef<Body[]>([]);
  const ballIconsRef = useRef<Map<Body, "dog" | "cat">>(new Map());
  const [Matter, setMatter] = useState<typeof import("matter-js")>();
  const [foodLevel, setFoodLevel] = useState(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Container dimensions
  const containerWidth = 320;
  const containerHeight = 600;

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
          setFoodLevel(data.level);
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

  // Update food balls based on food level
  useEffect(() => {
    if (!Matter || !engineRef.current) return;

    const targetBallCount = Math.floor(foodLevel / 2); // Each ball represents 5%
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
  }, [foodLevel, Matter]);

  const dispenseFoodHandler = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "dispenseFood" }));
    } else {
      console.warn("WebSocket not connected, cannot dispense food");
      setFoodLevel((prev) => Math.min(prev + 20, 100));
    }
  };

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
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg text-lg font-bold text-gray-700 shadow-lg border-2 border-gray-300">
          Pote de Ração
        </div>

        {/* Food Level Indicator */}
        <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-lg text-lg font-bold text-gray-700 shadow-lg border-2 border-gray-300">
          {foodLevel}%
        </div>
      </div>

      {/* Dispense Food Button */}
      <Button
        onClick={dispenseFoodHandler}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-8 text-lg flex items-center justify-center shadow-lg"
        size="lg"
      >
        <UtensilsCrossed className="mr-3 h-6 w-6" />
        Despejar Comida
      </Button>
    </div>
  );
};

export default FoodBowl;
