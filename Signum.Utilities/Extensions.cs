﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Reflection;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;
using System.Diagnostics;
using System.Globalization;

namespace Signum.Utilities
{
    [DebuggerStepThrough]
    public static class Extensions
    {
        #region Parse Number
        public static int? ToInt(this string str, NumberStyles ns = NumberStyles.Integer)
        {
            int result;
            if (int.TryParse(str, ns, CultureInfo.CurrentCulture, out result))
                return result;
            else
                return null;
        }

        public static long? ToLong(this string str, NumberStyles ns = NumberStyles.Integer)
        {
            long result;
            if (long.TryParse(str, ns, CultureInfo.CurrentCulture, out result))
                return result;
            else
                return null;
        }

        public static short? ToShort(this string str, NumberStyles ns = NumberStyles.Integer)
        {
            short result;
            if (short.TryParse(str, ns, CultureInfo.CurrentCulture, out result))
                return result;
            else
                return null;
        }

        public static float? ToFloat(this string str, NumberStyles ns = NumberStyles.Float | NumberStyles.AllowThousands)
        {
            float result;
            if (float.TryParse(str, ns, CultureInfo.CurrentCulture, out result))
                return result;
            else
                return null;
        }

        public static double? ToDouble(this string str, NumberStyles ns = NumberStyles.Float | NumberStyles.AllowThousands)
        {
            double result;
            if (double.TryParse(str, ns, CultureInfo.CurrentCulture, out result))
                return result;
            else
                return null;
        }

        public static decimal? ToDecimal(this string str, NumberStyles ns = NumberStyles.Number,CultureInfo ci=null)
        {
            decimal result;
            if (ci == null)
                ci = CultureInfo.CurrentCulture;

            if (decimal.TryParse(str, ns,ci , out result))
                return result;
            else
                return null;
        }

        public static int ToInt(this string str, string error)
        {
            int result;
            if (int.TryParse(str, out result))
                return result;

            throw new FormatException(error);
        }

        public static long ToLong(this string str, string error)
        {
            long result;
            if (long.TryParse(str, out result))
                return result;

            throw new FormatException(error);
        }

        public static short ToShort(this string str, string error)
        {
            short result;
            if (short.TryParse(str, out result))
                return result;

            throw new FormatException(error);
        }


        public static float? ToFloat(this string str, string error)
        {
            float result;
            if (float.TryParse(str, out result))
                return result;

            throw new FormatException(error);
        }

        public static double ToDouble(this string str, string error)
        {
            double result;
            if (double.TryParse(str, out result))
                return result;

            throw new FormatException(error);
        }

        public static decimal ToDecimal(this string str, string error)
        {
            decimal result;
            if (decimal.TryParse(str, out result))
                return result;

            throw new FormatException(error);
        }
        
        #endregion

        #region Math

        //http://en.wikipedia.org/wiki/Modulo_operation
        public static int Mod(this int a, int b)
        {
            int result = a % b;

            if (a < 0)
                result += b;

            if (b < 0)
                result -= b;

            return result;
        }


        public static long Mod(this long a, long b)
        {
            long mod = a % b;

            if (a < 0)
                mod += b;

            if (b < 0)
                mod -= b;

            return mod;
        }

        public static int DivMod(this int a, int b, out int mod)
        {
            int result = Math.DivRem(a, b, out mod);

            if (a < 0)
            {
                result--;
                mod += b;
            }

            if (b < 0)
            {
                result++;
                mod -= b;
            }

            return result;
        }

        public static long DivMod(this long a, long b, out long mod)
        {
            long result = Math.DivRem(a, b, out mod);

            if (a < 0)
            {
                result--;
                mod += b;
            }

            if (b < 0)
            {
                result++;
                mod -= b;
            }

            return result;
        }

        public static int DivCeiling(int a, int b)
        {
            return (a + b - 1) / b;
        }

        public static long DivCeiling(int a, long b)
        {
            return (a + b - 1) / b;
        }

        #endregion

        public static T? DefaultToNull<T>(this T value)
            where T : struct
        {
            return EqualityComparer<T>.Default.Equals(default(T), value) ? (T?)null : value;
        }

        public static T? DefaultToNull<T>(this T value, T defaultValue)
            where T : struct
        {
            return EqualityComparer<T>.Default.Equals(defaultValue, value) ? (T?)null : value;
        }

        public static int? NotFoundToNull(this int value)
        {
            return value == -1 ? null : (int?)value; 
        }

        public static int NotFound(this int value, int defaultValue)
        {
            return value == -1 ? defaultValue : value;
        }

        public static T ThrowIfNull<T>(this T? t, string message)
         where T : struct
        {
            if (t == null)
                throw new NullReferenceException(message);
            return t.Value;
        }

        public static T ThrowIfNull<T>(this T t, string message)
            where T : class
        {
            if (t == null)
                throw new NullReferenceException(message);
            return t;
        }


        public static T ThrowIfNull<T>(this T? t, Func<string> message)
         where T : struct
        {
            if (t == null)
                throw new NullReferenceException(message());
            return t.Value;
        }

        public static T ThrowIfNull<T>(this T t, Func<string> message)
            where T : class
        {
            if (t == null)
                throw new NullReferenceException(message());
            return t;
        }

        public static string TryToString(this object obj)
        {
            if (obj == null)
                return null;
            return obj.ToString(); 
        }

        public static string TryToString(this IFormattable obj, string format)
        {
            if (obj == null)
                return null;
            return obj.ToString(format, CultureInfo.CurrentCulture);
        }

        public static string TryToString(this IFormattable obj, string format, IFormatProvider formatProvider)
        {
            if (obj == null)
                return null;
            return obj.ToString(format, formatProvider);
        }

        #region Map Try Do TryDo
        public static R Let<T, R>(this T t, Func<T, R> func)
        {
            return func(t);
        }

        public delegate R FuncCC<in T, R>(T input)
            where T : class
            where R : class;
        public static R Try<T, R>(this T input, FuncCC<T, R> lambda)
            where T : class
            where R : class
        {
            return input == null ? null : lambda(input);
        }

        public delegate R FuncCS<in T, R>(T input)
            where T : class
            where R : struct;
        public static R? Try<T, R>(this T input, FuncCS<T, R> lambda)
            where T : class
            where R : struct
        {
            return input == null ? null : (R?)lambda(input);
        }

        public delegate R FuncCN<in T, R>(T input) where T : class;
        public static R? Try<T, R>(this T input, FuncCN<T, R?> lambda)
            where T : class
            where R : struct
        {
            return input == null ? null : lambda(input);
        }


        public delegate R FuncSC<in T, R>(T input)
            where T : struct
            where R : class;
        public static R Try<T, R>(this T? input, FuncSC<T, R> lambda)
            where T : struct
            where R : class
        {
            return input == null ? null : lambda(input.Value);
        }

        public delegate R FuncSS<in T, R>(T input)
            where T : struct
            where R : struct;
        public static T? Try<R, T>(this R? input, FuncSS<R, T> lambda)
            where R : struct
            where T : struct
        {
            return input == null ? null : (T?)lambda(input.Value);
        }

        public delegate R FuncSN<in T, R>(T input) where T : struct;
        public static R? Try<T, R>(this T? input, FuncSN<T, R?> lambda)
            where T : struct
            where R : struct
        {
            return input == null ? null : lambda(input.Value);
        }


        public static T Do<T>(this T t, Action<T> action)
        {
            action(t);
            return t;
        }

        public delegate void ActionC<T>(T obj) where T : class;
        public static T TryDo<T>(this T t, ActionC<T> action) where T : class
        {
            if (t != null)
                action(t);
            return t;
        }

        public delegate void ActionS<T>(T obj) where T : struct;
        public static T? TryDo<T>(this T? t, ActionS<T> action) where T : struct
        {
            if (t != null)
                action(t.Value);
            return t;
        }

        #endregion

        public static IEnumerable<int> To(this int start, int endNotIncluded)
        {
            for (int i = start; i < endNotIncluded; i++)
                yield return i;
        }

        public static IEnumerable<int> To(this int start, int endNotIncluded, int step)
        {
            for (int i = start; i < endNotIncluded; i += step)
                yield return i;
        }

        public static IEnumerable<DateTime> To(this DateTime start, DateTime endNotIncluded)
        {
            for (DateTime i = start; i < endNotIncluded; i = i.AddDays(1))
                yield return i;
        }

        public static IEnumerable<DateTime> To(this DateTime start, DateTime endNotIncluded, TimeSpan span)
        {
            for (DateTime i = start; i < endNotIncluded; i = i.Add(span))
                yield return i;
        }

        public static IEnumerable<int> DownTo(this int startNotIncluded, int end)
        {
            for (int i = startNotIncluded - 1; i >= end; i--)
                yield return i;
        }

        public static IEnumerable<int> DownTo(this int startNotIncluded, int end, int step)
        {
            for (int i = startNotIncluded - 1; i >= end; i-= step)
                yield return i;
        }

        public static IEnumerable<T> For<T>(this T start, Func<T, bool> condition, Func<T, T> increment)
        {
            for (T i = start; condition(i); i = increment(i))
                yield return i;
        }

        public static IEnumerable<T> Follow<T>(this T start, FuncCC<T, T> next) where T : class
        {
            for (T i = start; i != null; i = next(i))
                yield return i;
        }


        public static IEnumerable<T> Follow<T>(this T start, FuncSN<T, T?> next) where T : struct
        {
            for (T? i = start; i.HasValue; i = next(i.Value))
                yield return i.Value;
        }

        public static IEnumerable<T> Follow<T>(this T? start, FuncSN<T, T?> next) where T : struct
        {
            for (T? i = start; i.HasValue; i = next(i.Value))
                yield return i.Value;
        }

        public static T Throw<T>(this Exception exception) 
        {
            throw exception;
        }
    }

}
