import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

// Core role-checking utilities that work with both single role and role arrays
export type RoleInput = UserRole | UserRole[] | undefined

export function hasRole(roleOrRoles: RoleInput, target: UserRole): boolean {
  if (!roleOrRoles) return false
  if (Array.isArray(roleOrRoles)) return roleOrRoles.includes(target)
  return roleOrRoles === target
}

export function hasAnyRole(roleOrRoles: RoleInput, targets: UserRole[]): boolean {
  if (!roleOrRoles) return false
  if (Array.isArray(roleOrRoles)) return roleOrRoles.some(r => targets.includes(r))
  return targets.includes(roleOrRoles)
}

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  if (!hasAnyRole(user.role, allowedRoles)) {
    throw new Error("Forbidden")
  }
  return user
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword)
}

// Role checking utilities
export function isAdmin(role: RoleInput) {
  return hasRole(role, UserRole.ADMIN)
}

export function isFormationSupport(role: RoleInput) {
  return hasAnyRole(role, [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])
}

export function isLifeLineLeader(role: RoleInput) {
  return hasAnyRole(role, [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])
}

export function canAccessDashboard(role: RoleInput) {
  if (!role) return false
  if (Array.isArray(role)) return role.some(r => r !== UserRole.MEMBER)
  return role !== UserRole.MEMBER
}

export function canManageUsers(role: RoleInput) {
  return isAdmin(role)
}

export function canManageFormationRequests(role: RoleInput) {
  return isFormationSupport(role)
}

export function canManageSupportTickets(role: RoleInput) {
  return isFormationSupport(role)
}

export function canManageLifeLines(userId: string, lifeLineLeaderId: string, role: RoleInput) {
  return userId === lifeLineLeaderId || isFormationSupport(role)
}

export function canViewInquiries(userId: string, lifeLineLeaderId: string, role: RoleInput) {
  return userId === lifeLineLeaderId || isFormationSupport(role)
}

export function canViewSupportTickets(userId: string, ticketRequesterId: string, role: RoleInput) {
  return userId === ticketRequesterId || isFormationSupport(role)
}

export function generateResetToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}