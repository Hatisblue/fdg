'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Sparkles, Shield, Palette, Globe, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">StoryCanvas</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            <Link href="#about" className="text-sm font-medium hover:text-primary">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
              Create Magical{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Children's Books
              </span>{' '}
              with AI
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Transform your stories into beautiful, animated 3D books.
              Perfect for children and families. Safe, creative, and educational.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Creating Free
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Everything you need to create amazing stories
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powered by the latest AI technology to bring your imagination to life
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border bg-card p-8 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to create your first book?
            </h2>
            <p className="mt-4 text-lg opacity-90">
              Join thousands of families creating magical stories together
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button size="lg" variant="secondary">
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-bold">StoryCanvas</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Creating magical stories for families worldwide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="#demo">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#about">About</Link></li>
                <li><Link href="#contact">Contact</Link></li>
                <li><Link href="#privacy">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#help">Help Center</Link></li>
                <li><Link href="#docs">Documentation</Link></li>
                <li><Link href="#community">Community</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © 2025 StoryCanvas. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    title: 'AI Story Generation',
    description: 'GPT-4 powered stories that are safe, educational, and engaging for children of all ages.',
    icon: <Sparkles className="h-6 w-6 text-primary" />,
  },
  {
    title: 'Beautiful Illustrations',
    description: 'DALL-E 3 creates stunning, child-friendly illustrations in multiple artistic styles.',
    icon: <Palette className="h-6 w-6 text-primary" />,
  },
  {
    title: 'Content Safety',
    description: 'Advanced AI moderation ensures all content is 100% safe and appropriate for children.',
    icon: <Shield className="h-6 w-6 text-primary" />,
  },
  {
    title: '3D Book Viewer',
    description: 'Interactive 3D book experience with realistic page-turning animations.',
    icon: <BookOpen className="h-6 w-6 text-primary" />,
  },
  {
    title: 'Multi-language',
    description: 'Create stories in multiple languages to share with children around the world.',
    icon: <Globe className="h-6 w-6 text-primary" />,
  },
  {
    title: 'Lightning Fast',
    description: 'Generate complete books in minutes with our optimized AI pipeline.',
    icon: <Zap className="h-6 w-6 text-primary" />,
  },
]
