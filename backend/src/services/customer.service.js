import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { createId } from "../utils/id.js";
import { customerModel } from "../models/customer.model.js";
import { domainService } from "./domain.service.js";
import { sortBy } from "../utils/sort.js";

export const customerService = {
  async getCustomers(filters = {}) {
    const customers = await customerModel.findAll();
    let filtered = customers;

    if (filters.artisanId) {
      filtered = filtered.filter((item) => item.artisanId === filters.artisanId);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((item) =>
        [item.name, item.email, item.phone].some((value) => value?.toLowerCase().includes(search)),
      );
    }

    return sortBy(filtered, "createdAt", "desc");
  },

  async createCustomer(payload) {
    if (!payload.artisanId || !payload.name?.trim()) {
      throw new AppError("Artisan and customer name are required.", HTTP_STATUS.BAD_REQUEST);
    }

    await domainService.ensureArtisanExists(payload.artisanId);

    const normalizedEmail = payload.email?.trim()?.toLowerCase() || null;
    if (normalizedEmail) {
      const existingCustomers = await customerModel.findAll();
      const duplicate = existingCustomers.find(
        (item) => item.artisanId === payload.artisanId && item.email?.toLowerCase() === normalizedEmail,
      );

      if (duplicate) {
        throw new AppError(MESSAGES.DUPLICATE_CUSTOMER_EMAIL, HTTP_STATUS.CONFLICT);
      }
    }

    return customerModel.create({
      id: createId(),
      artisanId: payload.artisanId,
      name: payload.name.trim(),
      email: normalizedEmail,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
      notes: payload.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateCustomer(id, payload) {
    const existingCustomer = await customerModel.findById(id);
    if (!existingCustomer) {
      throw new AppError(MESSAGES.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const artisanId = payload.artisanId || existingCustomer.artisanId;
    await domainService.ensureArtisanExists(artisanId);

    const normalizedEmail =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() || null : payload.email;

    if (normalizedEmail) {
      const existingCustomers = await customerModel.findAll();
      const duplicate = existingCustomers.find(
        (item) =>
          item.id !== id && item.artisanId === artisanId && item.email?.toLowerCase() === normalizedEmail,
      );

      if (duplicate) {
        throw new AppError(MESSAGES.DUPLICATE_CUSTOMER_EMAIL, HTTP_STATUS.CONFLICT);
      }
    }

    const customer = await customerModel.updateById(id, {
      ...payload,
      artisanId,
      name: payload.name?.trim() || payload.name,
      email: normalizedEmail,
      phone: typeof payload.phone === "string" ? payload.phone.trim() || null : payload.phone,
      address: typeof payload.address === "string" ? payload.address.trim() || null : payload.address,
      notes: typeof payload.notes === "string" ? payload.notes.trim() || null : payload.notes,
    });

    if (!customer) {
      throw new AppError(MESSAGES.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return customer;
  },

  async deleteCustomer(id) {
    const removed = await customerModel.deleteById(id);
    if (!removed) {
      throw new AppError(MESSAGES.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return removed;
  },
};
