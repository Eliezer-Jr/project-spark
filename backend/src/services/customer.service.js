import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { createId } from "../utils/id.js";
import { customerModel } from "../models/customer.model.js";
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

    return customerModel.create({
      id: createId(),
      artisanId: payload.artisanId,
      name: payload.name.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
      notes: payload.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateCustomer(id, payload) {
    const customer = await customerModel.updateById(id, {
      ...payload,
      name: payload.name?.trim() || payload.name,
      email: typeof payload.email === "string" ? payload.email.trim() || null : payload.email,
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
