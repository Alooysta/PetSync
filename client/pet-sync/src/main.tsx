import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Agendamento from './components/Agendamento.tsx';
// import FoodBowl from './components/FoodBowl.tsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Cat, Dog, PawPrint } from 'lucide-react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
                    PetSync
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sistema Inteligente de Alimentação
                  </p>
                </div>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="hidden sm:flex items-center space-x-1"
            >
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Online</span>
            </Badge>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
        <div className="container mx-auto px-6 py-12 relative">
          <div className="text-center space-y-4">
            <Badge variant="outline" className="mb-4">
              Tecnologia Avançada para Pets
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent dark:from-white dark:via-blue-200 dark:to-indigo-200">
              Cuide do seu pet com
              <br />
              <span className="text-blue-600 dark:text-blue-400">
                automatização integrada
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Monitore, agende e controle a alimentação do seu pet de forma
              automatizada e inteligente.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-center max-w-7xl mx-auto">
          <div className="w-full max-w-2xl">
            <Card className="group hover:shadow-2xl transition-all duration-500 border-0 shadow-xl bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
              <CardContent className="p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Agendamento Inteligente
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Configure horários ou mantenha o pote cheio
                      automaticamente
                    </p>
                  </div>
                </div>
                <Separator className="mb-6" />
                <Agendamento />
              </CardContent>
            </Card>
          </div>

          {/* Keep the commented FoodBowl card */}
          {/* <Card className="group hover:shadow-2xl transition-all duration-500 border-0 shadow-xl bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
            <CardContent className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <PawPrint className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Status da Tigela
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Monitore o nível de ração em tempo real
                  </p>
                </div>
              </div>
              <Separator className="mb-6" />
              <FoodBowl />
            </CardContent>
          </Card> */}
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-0 bg-white/40 backdrop-blur-sm dark:bg-slate-800/40">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                24/7
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Monitoramento Contínuo
              </div>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-0 bg-white/40 backdrop-blur-sm dark:bg-slate-800/40">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                100%
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Alimentação Automatizada
              </div>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-0 bg-white/40 backdrop-blur-sm dark:bg-slate-800/40">
              <div className="flex justify-center items-center gap-4 mb-2">
                <Cat className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                <Dog className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                O bem estar do seu pet garantido!
              </div>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/50 bg-white/60 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/60 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">
                PetSync
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-center">
              © 2024 PetSync - Cuide do seu pet com tecnologia avançada
            </p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-xs">
                v2.0
              </Badge>
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Sistema Operacional</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </StrictMode>
);
