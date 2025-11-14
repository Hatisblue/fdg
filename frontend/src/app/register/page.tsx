'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { authAPI } from '@/lib/api'
import { checkPasswordStrength, isValidEmail, isValidName, sanitizeInput } from '@/lib/validation'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const passwordStrength = checkPasswordStrength(formData.password)

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // First name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required'
    } else if (!isValidName(formData.firstName)) {
      newErrors.firstName = 'First name can only contain letters, spaces, and hyphens'
    }

    // Last name validation
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required'
    } else if (!isValidName(formData.lastName)) {
      newErrors.lastName = 'Last name can only contain letters, spaces, and hyphens'
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!passwordStrength.isStrong) {
      newErrors.password = 'Password is not strong enough'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.register({
        firstName: sanitizeInput(formData.firstName),
        lastName: sanitizeInput(formData.lastName),
        email: sanitizeInput(formData.email),
        password: formData.password,
      })

      // Store tokens and user data
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      toast({
        title: 'Success!',
        description: 'Your account has been created successfully.',
        variant: 'success',
      })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed. Please try again.'

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 0) return 'bg-gray-300'
    if (passwordStrength.score === 1) return 'bg-red-500'
    if (passwordStrength.score === 2) return 'bg-orange-500'
    if (passwordStrength.score === 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength.score === 0) return 'Too weak'
    if (passwordStrength.score === 1) return 'Weak'
    if (passwordStrength.score === 2) return 'Fair'
    if (passwordStrength.score === 3) return 'Good'
    return 'Strong'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">StoryCanvas</span>
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value })
                    if (errors.firstName) {
                      setErrors({ ...errors, firstName: '' })
                    }
                  }}
                  className={errors.firstName ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value })
                    if (errors.lastName) {
                      setErrors({ ...errors, lastName: '' })
                    }
                  }}
                  className={errors.lastName ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) {
                    setErrors({ ...errors, email: '' })
                  }
                }}
                className={errors.email ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (errors.password) {
                      setErrors({ ...errors, password: '' })
                    }
                  }}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password strength indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="space-y-1">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {passwordStrength.isStrong && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Password is strong
                    </p>
                  )}
                </div>
              )}

              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value })
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: '' })
                    }
                  }}
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordStrength.isStrong}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
