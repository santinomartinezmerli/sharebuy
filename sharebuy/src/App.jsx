import { supabase } from './lib/supabase'

function App() {
  console.log('Supabase client:', supabase)
  
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <h1 className="text-4xl font-semibold text-green-600">ShareBuy</h1>
    </div>
  )
}

export default App