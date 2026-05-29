import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <span className="text-blue-500 font-bold text-2xl">Strata</span>
        <p className="text-slate-500 text-sm mt-1">See the performance layers your POS never showed you.</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "bg-slate-900 border border-slate-800 shadow-xl",
            headerTitle: "text-slate-100",
            headerSubtitle: "text-slate-400",
            formFieldLabel: "text-slate-300",
            formFieldInput: "bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-500",
            footerActionLink: "text-blue-400 hover:text-blue-300",
            identityPreviewText: "text-slate-300",
            identityPreviewEditButtonIcon: "text-slate-400",
          },
        }}
      />
    </div>
  );
}
