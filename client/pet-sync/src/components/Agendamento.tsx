import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Plus, Trash2, RefreshCw, Cat, Dog } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Time picker options
const timeOptions: { value: string; label: string }[] = [];
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    const formattedHour = hour.toString().padStart(2, "0");
    const formattedMinute = minute.toString().padStart(2, "0");
    timeOptions.push({
      value: `${formattedHour}:${formattedMinute}`,
      label: `${formattedHour}:${formattedMinute}`,
    });
  }
}

interface TimeSlot {
  id: number;
  time: string;
  enabled: boolean;
}

interface SaveAgendamentoRequest {
  id: string;
  hora: string;
  hasAutomatico: boolean;
  enabled: boolean;
}

function Agendamento() {
  const [times, setTimes] = useState<TimeSlot[]>([
    { id: 1, time: "08:00", enabled: true },
  ]);
  const [autoRefill, setAutoRefill] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState<number | null>(null);
  const [shouldSave, setShouldSave] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const fetchAgendamentos = async () => {
      try {
        const response = await fetch(
          "https://petsync.onrender.com/api/listaAgendamentos"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch agendamentos");
        }
        const data = await response.json();

        const transformedData = data.map((item: SaveAgendamentoRequest) => ({
          id: parseInt(item.id),
          time: item.hora,
          enabled: item.enabled,
        }));

        setTimes(transformedData);
        setAutoRefill(data[0]?.hasAutomatico || false);
      } catch (error) {
        console.error("Error fetching agendamentos:", error);
      }
    };

    fetchAgendamentos();
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

        if (data.autoRefill !== undefined) {
          setAutoRefill(data.autoRefill);
        }

        // Handle initial agendamentos data sent on connection
        if (data.agendamentos && Array.isArray(data.agendamentos)) {
          console.log(
            "Received agendamentos via WebSocket:",
            data.agendamentos
          );
          const transformedData = data.agendamentos.map(
            (item: SaveAgendamentoRequest) => ({
              id: parseInt(item.id),
              time: item.hora,
              enabled: item.enabled,
            })
          );
          setTimes(transformedData);
          if (data.agendamentos.length > 0) {
            setAutoRefill(data.agendamentos[0].hasAutomatico || false);
          }
        }

        // Handle other message types
        if (data.type === "dispenseFood") {
          console.log("Dispense food message received:", data.message);
        }

        if (data.type === "agendamentosUpdate") {
          console.log("Agendamentos update received:", data.agendamentos);
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
    if (autoRefill) {
      setTimes((prevTimes) =>
        prevTimes.map((time) => ({ ...time, enabled: false }))
      );
    }
  }, [autoRefill]);

  const addTime = () => {
    if (times.length < 5) {
      const newId = Math.max(0, ...times.map((t) => t.id)) + 1;
      setTimes([...times, { id: newId, time: "", enabled: !autoRefill }]);
    }
  };

  const removeTime = (id: number) => {
    setTimes(times.filter((time) => time.id !== id));
  };

  const updateTime = (
    id: number,
    field: keyof TimeSlot,
    value: string | boolean
  ) => {
    if (field === "time") {
      setTimePickerOpen(null);
    }
    setTimes(
      times.map((time) => {
        if (time.id === id) {
          return { ...time, [field]: value };
        }
        return time;
      })
    );
  };

  const toggleAutoRefill = (checked: boolean) => {
    setAutoRefill(checked);
    // Send the new auto refill state through WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ autoRefill: checked }));
    }
  };

  const handleSaveClick = () => {
    setAlertOpen(true);
  };

  useEffect(() => {
    const saveAgendamento = async () => {
      try {
        const agendamentos: SaveAgendamentoRequest[] = times.map(
          (time, index) => ({
            id: (index + 1).toString(),
            hora: time.time,
            hasAutomatico: autoRefill,
            enabled: time.enabled,
          })
        );

        const saveResponse = await fetch(
          "https://petsync.onrender.com/api/salvarAgendamento",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(agendamentos),
          }
        );

        if (!saveResponse.ok) {
          throw new Error("Falha ao salvar agendamento");
        }

        const saveData = await saveResponse.json();
        console.log("Save Response:", saveData);

        // Send agendamentos data via WebSocket after successful save
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              agendamentos: agendamentos,
            })
          );
          console.log("Agendamentos sent via WebSocket:", agendamentos);
        }

        setAlertOpen(false);
      } catch (error) {
        console.error("API Error:", error);
      } finally {
        setShouldSave(false);
      }
    };

    if (shouldSave) {
      saveAgendamento();
    }
  }, [shouldSave, times, autoRefill, socket]);

  const handleConfirmSave = () => {
    setShouldSave(true);
  };

  const usedTimes = times.map((t) => t.time);

  return (
    <div className="flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg  border-blue-500/30">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg ">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">
                PetSync
              </CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                Agende as refeições do seu pet!
              </CardDescription>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white opacity-70" />
          </div>
        </CardHeader>

        <CardContent className="pt-4 sm:pt-6 bg-gray-50">
          {/* Auto refill toggle */}
          <div className="mb-6 p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw
                  className={`h-5 w-5 ${
                    autoRefill ? "text-green-500" : "text-gray-400"
                  }`}
                />
                <Label
                  htmlFor="auto-refill"
                  className="text-gray-700 font-medium"
                >
                  Repor Automaticamente
                </Label>
              </div>
              <Switch
                checked={autoRefill}
                onCheckedChange={toggleAutoRefill}
                id="auto-refill"
                className={autoRefill ? "bg-green-500" : ""}
              />
            </div>
          </div>

          <div className="space-y-4">
            {times.map((time) => (
              <div
                key={time.id}
                className="flex flex-col p-3 rounded-lg bg-white border border-gray-200 shadow-sm"
              >
                <div className="flex flex-wrap sm:flex-nowrap items-center w-full">
                  <div className="flex items-center space-x-3 flex-1 w-full sm:w-auto mb-2 sm:mb-0">
                    <div className="flex items-center space-x-2">
                      <Popover
                        open={timePickerOpen === time.id}
                        onOpenChange={(open) =>
                          setTimePickerOpen(open ? time.id : null)
                        }
                      >
                        <PopoverTrigger>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-[140px] justify-start text-left font-normal",
                              !time.time && "text-muted-foreground"
                            )}
                            disabled={autoRefill}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {time.time || "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="p-0 w-[240px]"
                          side="bottom"
                          sideOffset={4}
                          align="start"
                          alignOffset={-50}
                          avoidCollisions={true}
                        >
                          <div className="grid grid-cols-4 gap-2 p-2 max-h-80 overflow-y-auto">
                            {timeOptions.map((option) => {
                              const isUsed =
                                usedTimes.includes(option.value) &&
                                time.time !== option.value;
                              return (
                                <Button
                                  key={option.value}
                                  variant={
                                    time.time === option.value
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className={cn(
                                    "font-mono",
                                    isUsed && "opacity-50 cursor-not-allowed"
                                  )}
                                  onClick={() =>
                                    updateTime(time.id, "time", option.value)
                                  }
                                  disabled={isUsed}
                                >
                                  {option.label}
                                </Button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="hidden md:flex ml-4 items-center space-x-6">
                      <Cat />
                      <Dog className="mr-4" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={time.enabled}
                      onCheckedChange={(checked) =>
                        updateTime(time.id, "enabled", checked)
                      }
                      id={`switch-${time.id}`}
                      disabled={autoRefill}
                    />
                    <Label
                      htmlFor={`switch-${time.id}`}
                      className={`${
                        autoRefill ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {time.enabled && !autoRefill ? "Ativado" : "Inativo"}
                    </Label>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTime(time.id)}
                    className="ml-auto text-gray-500 hover:text-red-500"
                    disabled={autoRefill}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}

            {times.length < 5 && (
              <Button
                variant="outline"
                className="w-full flex items-center justify-center border-dashed border-2 py-4 sm:py-6 text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
                onClick={addTime}
                disabled={autoRefill}
              >
                <Plus className="mr-2 h-5 w-5" />
                <span className="text-sm sm:text-base">
                  Agendar refeição ({times.length}/5)
                </span>
              </Button>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:justify-between border-t p-4 bg-gray-50 gap-3">
          <div className="text-sm text-gray-500 w-full sm:w-auto text-center sm:text-left">
            {autoRefill ? (
              <span className="font-medium text-green-600">
                Auto refill mode active
              </span>
            ) : (
              <span>
                {times.filter((t) => t.enabled).length}
                {times.filter((t) => t.enabled).length !== 1
                  ? " Refeições"
                  : " Refeição"}
              </span>
            )}
          </div>
          <Button
            className="bg-black w-full sm:w-auto text-white hover:text-black"
            onClick={handleSaveClick}
            variant={"outline"}
          >
            Confirme Agendamento
          </Button>
        </CardFooter>
      </Card>

      {/* Alert Dialog for confirming schedule changes */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar alteração de configuração
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que quer alterar a configuração atual?
              {autoRefill && (
                <p className="mt-2 font-medium text-amber-600">
                  O parâmetro "Repor Automaticamente" está ativo. Quer seguir
                  mesmo assim?
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Agendamento;
