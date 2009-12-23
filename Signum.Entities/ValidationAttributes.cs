﻿using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Resources;
using System.Text;
using System.Text.RegularExpressions;
using Signum.Entities.Properties;
using Signum.Entities.Reflection;
using Signum.Utilities;
using Signum.Utilities.ExpressionTrees;
using Signum.Utilities.Reflection;

namespace Signum.Entities
{
    [AttributeUsage(AttributeTargets.Property, Inherited = true, AllowMultiple = true)]
    public class HiddenPropertyAttribute : Attribute
    {

    }

    [AttributeUsage(AttributeTargets.Property, Inherited = true, AllowMultiple = true)]
    public class UnitAttribute : Attribute
    {
        public string UnitName { get; private set; }
        public UnitAttribute(string unitName)
        {
            this.UnitName = unitName; 
        }
    }

    [AttributeUsage(AttributeTargets.Property, Inherited = true, AllowMultiple = true)]
    public class FormatAttribute : Attribute
    {
        public string Format { get; private set; }
        public FormatAttribute(string format)
        {
            this.Format = format;
        }
    }

    [AttributeUsage(AttributeTargets.Property, Inherited = true, AllowMultiple = true)]
    public abstract class ValidatorAttribute : Attribute
    {
        public bool DisableOnCorrupt { get; set; }
        public string ErrorMessage { get; set; }

        public abstract string HelpMessage { get; }
       
        public string Error(object value)
        {
            if (DisableOnCorrupt && !Corruption.Strict)
                return null;

            string defaultError = OverrideError(value);

            if (defaultError == null)
                return null;

            return ErrorMessage ?? defaultError;
        }

        /// <summary>
        /// When overriden, validates the value against this validator rule
        /// </summary>
        /// <param name="value"></param>
        /// <returns>returns an string with the error message, using {0} if you want the property name to be inserted</returns>
        protected abstract string OverrideError(object value);
    }

    public class NotNullValidatorAttribute : ValidatorAttribute
    {
        protected override string OverrideError(object obj)
        {
            if (obj == null)
                return Resources.Property0HasNoValue;

            return null;
        }

        public override string HelpMessage
        {
            get { return Resources.BeNotNull; }
        }
    }

    public class StringLengthValidatorAttribute : ValidatorAttribute
    {
        int min = -1;
        int max = -1;
        bool allowNulls = false;

        public bool AllowNulls
        {
            get { return allowNulls; }
            set { allowNulls = value; }
        }

        public int Min
        {
            get { return min; }
            set { min = value; }
        }

        public int Max
        {
            get { return max; }
            set { max = value; }
        }

        protected override string OverrideError(object value)
        {
            string val = (string)value;

            if (string.IsNullOrEmpty(val))
                return allowNulls ? null : Resources.Property0HasNoValue;

            if (min == max && min != -1 && val.Length != min)
                return Resources.TheLenghtOf0HasToBeEqualTo0.Formato(min);

            if (min != -1 && val.Length < min)
                return Resources.TheLengthOf0HasToBeGreaterOrEqualTo0.Formato(min);

            if (max != -1 && val.Length > max)
                return Resources.TheLengthOf0HasToBeLesserOrEqualTo0.Formato(max);

            return null; 
        }

        public override string HelpMessage
        {
            get
            {
                string result =
                    min != -1 && max != -1 ? Resources.HaveBetween0And1Characters.Formato(min, max) :
                    min != -1 ? Resources.HaveMinimum0Characters.Formato(min) :
                    max != -1 ? Resources.HaveMaximun0Characters.Formato(max) : null;

                if (allowNulls)
                    result = result.Add(Resources.OrBeNull, " ");

                return result;
            }
        }
    }


    public class RegexValidatorAttribute : ValidatorAttribute
    {
        Regex regex;         
        public RegexValidatorAttribute(string regex)
        {
            this.regex = new Regex(regex);
        }

        string formatName;        
        public string FormatName
        {
            get { return formatName; }
            set { formatName = value; }
        }

        protected override string OverrideError(object value)
        {
            string str = (string)value;
            if (string.IsNullOrEmpty(str))
                return null;

            if (regex.IsMatch(str))
                return null;

            if (formatName == null)
                return Resources._0HasNoCorrectFormat;
            else
                return Resources._0DoesNotHaveAValid0Format.Formato(formatName);
        }

        public override string HelpMessage
        {
            get
            {
                return Resources.HaveValid0Format.Formato(formatName);
            }
        }
    }

    public class EmailValidatorAttribute : RegexValidatorAttribute
    {
        const string EmailRegex = @"^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}" +
                          @"\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\" +
                          @".)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$";

        public EmailValidatorAttribute()
            : base(EmailRegex)
        {
            this.FormatName = "e-Mail";
        }
    }

    public class TelephoneValidatorAttribute : RegexValidatorAttribute
    {
        const string TelephoneRegex = @"^((\+|00)\d\d)? *(\([ 0-9]+\))? *[0-9][ \-0-9]+$";

        public TelephoneValidatorAttribute()
            : base(TelephoneRegex)
        {
            this.FormatName = Resources.Telephone;
        }
    }

    public class URLValidatorAttribute : RegexValidatorAttribute
    {
        const string URLRegex = 
              "^(https?://)" 
            + "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" //user@ 
            + @"(([0-9]{1,3}\.){3}[0-9]{1,3}" // IP- 199.194.52.184 
            + "|" // allows either IP or domain 
            + @"([0-9a-z_!~*'()-]+\.)*" // tertiary domain(s)- www. 
            + @"([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\." // second level domain 
            + "[a-z]{2,6})" // first level domain- .com or .museum 
            + "(:[0-9]{1,4})?" // port number- :80 
            + "((/?)|" // a slash isn't required if there is no file name 
            + "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";

        public URLValidatorAttribute()
            : base(URLRegex)
        {
            this.FormatName = "URL";
        }
    }

    public class FileNameValidatorAttribute : RegexValidatorAttribute
    {
        const string FileNameRegex = @"^(?!^(PRN|AUX|CLOCK\$|NUL|CON|COM\d|LPT\d|\..*)(\..+)?$)[^\x00-\x1f\\?*:\"";|/]+$";
        public FileNameValidatorAttribute() : base(FileNameRegex)
        {
            this.FormatName = Resources.FileName;
        }
    }

    public class DecimalsValidatorAttribute : ValidatorAttribute
    {
        public int DecimalPlaces {get;set;}

        public DecimalsValidatorAttribute()
        {
            DecimalPlaces = 2; 
        }

        public DecimalsValidatorAttribute(int decimalPlaces)
        {
            this.DecimalPlaces = decimalPlaces; 
        }

        protected override string OverrideError(object value)
        {
            if (value == null)
                return null;

            if (value is decimal && Math.Round((decimal)value, DecimalPlaces) != (decimal)value ||
                value is float && Math.Round((float)value, DecimalPlaces) != (float)value ||
                value is double && Math.Round((double)value, DecimalPlaces) != (double)value)
            {
                return Resources._0HasMoreThan0DecimalPlaces.Formato(DecimalPlaces);
            }

            return null;
        }

        public override string HelpMessage
        {
            get { return Resources.Have0Decimals.Formato(DecimalPlaces); }
        }
    }


    public class NumberIsValidatorAttribute : ValidatorAttribute
    {
        public ComparisonType ComparisonType;
        public IComparable number;

        public NumberIsValidatorAttribute(ComparisonType comparison, float number)
        {
            this.ComparisonType = comparison;
            this.number = number; 
        }

        public NumberIsValidatorAttribute(ComparisonType comparison, double number)
        {
            this.ComparisonType = comparison;
            this.number = number;
        }

        public NumberIsValidatorAttribute(ComparisonType comparison, byte number)
        {
            this.ComparisonType = comparison;
            this.number = number;
        }

        public NumberIsValidatorAttribute(ComparisonType comparison, short number)
        {
            this.ComparisonType = comparison;
            this.number = number;
        }

        public NumberIsValidatorAttribute(ComparisonType comparison, int number)
        {
            this.ComparisonType = comparison;
            this.number = number;
        }

        public NumberIsValidatorAttribute(ComparisonType comparison, long number)
        {
            this.ComparisonType = comparison;
            this.number = number;
        }

        protected override string OverrideError(object value)
        {
            if (value == null)
                return null;

            IComparable val = (IComparable)value;

            if (number.GetType() != value.GetType())
                number = (IComparable)Convert.ChangeType(number, value.GetType()); // asi se hace solo una vez 

            bool ok = (ComparisonType == ComparisonType.EqualTo && val.CompareTo(number) == 0) ||
                      (ComparisonType == ComparisonType.DistinctTo && val.CompareTo(number) != 0) ||
                      (ComparisonType == ComparisonType.GreaterThan && val.CompareTo(number) > 0) ||
                      (ComparisonType == ComparisonType.GreaterThanOrEqual && val.CompareTo(number) >= 0) ||
                      (ComparisonType == ComparisonType.LessThan && val.CompareTo(number) < 0) ||
                      (ComparisonType == ComparisonType.LessThanOrEqual && val.CompareTo(number) <= 0);

            if (ok)
                return null;

            return Resources._0HasToBe0Than1.Formato(ComparisonType.NiceToString(), number.ToString()); 
        }

        public override string HelpMessage
        {
            get { return Resources.Be + ComparisonType.NiceToString() + " " + number.ToString(); }
        }
    }

    //Not using C intervals to please user!
    public class NumberBetweenValidatorAttribute : ValidatorAttribute
    {
        IComparable min;
        IComparable max;

        public NumberBetweenValidatorAttribute(float min, float max)
        {
            this.min = min;
            this.max = max;
        }

        public NumberBetweenValidatorAttribute(double min, double max)
        {
            this.min = min;
            this.max = max;
        }

        public NumberBetweenValidatorAttribute(byte min, byte max)
        {
            this.min = min;
            this.max = max;
        }

        public NumberBetweenValidatorAttribute(short min, short max)
        {
            this.min = min;
            this.max = max;
        }

        public NumberBetweenValidatorAttribute(int min, int max)
        {
            this.min = min;
            this.max = max;
        }

        public NumberBetweenValidatorAttribute(long min, long max)
        {
            this.min = min;
            this.max = max;
        }
     
        protected override string OverrideError(object value)
        {
            if (value == null)
                return null;

            IComparable val = (IComparable)value;

            if (min.GetType() != value.GetType())
            {
                min = (IComparable)Convert.ChangeType(min, val.GetType()); // asi se hace solo una vez 
                max = (IComparable)Convert.ChangeType(max, val.GetType());
            }

            if (min.CompareTo(val) <= 0 &&
                val.CompareTo(max) <= 0)
                return null;

            return Resources._0HasToBeBetween0And1.Formato(min, max); 
        }

        public override string HelpMessage
        {
            get { return Resources.BeBetween0And1.Formato(min, max); }
        }
    }

    public class NoRepeatValidator : ValidatorAttribute
    {
        protected override string OverrideError(object value)
        {
            IList list = (IList)value;
            if (list == null || list.Count <= 1)
                return null;
            string ex = list.Cast<object>().GroupCount().Where(kvp => kvp.Value > 1).ToString(e => "{0} x {1}".Formato(e.Key, e.Value), ", ");
            if (ex.HasText())
                return Properties.Resources._0HasSomeRepeatedElements0.Formato(ex);
            return null;
        }

        public override string HelpMessage
        {
            get { return Resources.HaveNoRepeatedElements; }
        }
    }

    public class CountIsValidatorAttribute : ValidatorAttribute
    {
        public ComparisonType ComparisonType;
        public int number;

        public CountIsValidatorAttribute(ComparisonType comparison, int number)
        {
            this.ComparisonType = comparison;
            this.number = number;
        }

        protected override string OverrideError(object value)
        {
            IList list = (IList)value;
            if (list == null)
                return null;

            int val = list.Count;

            if ((ComparisonType == ComparisonType.EqualTo && val.CompareTo(number) == 0) ||
                (ComparisonType == ComparisonType.DistinctTo && val.CompareTo(number) != 0) ||
                (ComparisonType == ComparisonType.GreaterThan && val.CompareTo(number) > 0) ||
                (ComparisonType == ComparisonType.GreaterThanOrEqual && val.CompareTo(number) >= 0) ||
                (ComparisonType == ComparisonType.LessThan && val.CompareTo(number) < 0) ||
                (ComparisonType == ComparisonType.LessThanOrEqual && val.CompareTo(number) <= 0))
                return null;

            return Resources.TheNumberOfElementsOf0HasToBe01.Formato(ComparisonType.NiceToString(), number.ToString());
        }

        public override string HelpMessage
        {
            get { return Resources.HaveANumberOfElements01.Formato(ComparisonType.NiceToString(), number.ToString()); }
        }
    }

    public class DateOnlyValidatorAttribute : ValidatorAttribute
    {
        protected override string OverrideError(object value)
        {
            DateTime? dt = (DateTime?)value;
            if (dt.HasValue && dt.Value != dt.Value.Date)
                return Resources._0HasHoursMinutesAndSeconds;
            
            return null;
        }

        public override string HelpMessage
        {
            get { return Resources.HaveNoTimePart; }
        }
    }

    public class StringCaseAttribute : ValidatorAttribute
    {
        private Case textCase;
        public Case TextCase
        {
            get { return this.textCase; }
            set { this.textCase = value; }
        }

        public StringCaseAttribute(Case textCase)
        {
            this.textCase = textCase;
        }

        protected override string OverrideError(object value)
        {

            if (string.IsNullOrEmpty((string)value)) return null;

            string str = (string)value;

            if ((this.textCase == Case.Uppercase) && (str != str.ToUpper()))
                return Resources._0HasToBeUppercase;

            if ((this.textCase == Case.Lowercase) && (str != str.ToLower()))
                return Resources._0HasToBeLowercase;

            return null;
        }

        public override string HelpMessage
        {
            get { return Resources.Be + textCase.NiceToString(); }
        }
    }

    public enum Case
    {
        Uppercase,
        Lowercase
    }
 
    public enum ComparisonType
    {
        EqualTo,
        DistinctTo,
        GreaterThan,
        GreaterThanOrEqual,
        LessThan,
        LessThanOrEqual,
    }

    public class StateValidator<E, S>: IEnumerable
        where E : IdentifiableEntity
        where S : struct
    {
        Func<E, S> getState;
        string[] propertyNames;
        string[] propertyNiceNames;
        Func<E, object>[] getters;

        Dictionary<S, bool?[]> dictionary = new Dictionary<S, bool?[]>();

        public StateValidator(Func<E, S> getState, params Expression<Func<E, object>>[] properties)
        {
            this.getState = getState;
            PropertyInfo[] pis = properties.Select(p => SlowPropertyInfo(p)).ToArray();
            propertyNames = pis.Select(pi => pi.Name).ToArray();
            propertyNiceNames = pis.Select(pi => pi.NiceName()).ToArray();
            getters = properties.Select(p => p.Compile()).ToArray();
        }

        public static PropertyInfo SlowPropertyInfo(LambdaExpression property)
        {
            if (property == null)
                throw new ArgumentNullException("property");

            Expression body = property.Body;
            if (body.NodeType == ExpressionType.Convert)
                body = ((UnaryExpression)body).Operand;

            MemberExpression ex = body as MemberExpression;
            if (ex == null)
                throw new ArgumentException(Resources.PropertyShouldBeAnExpressionAccessingAProperty);

            PropertyInfo pi = ex.Member as PropertyInfo;
            if (pi == null)
                throw new ArgumentException(Resources.PropertyShouldBeAnExpressionAccessingAProperty);

            return pi;
        }

        public void Add(S state, params bool?[] necessary)
        {
            if (necessary == null && necessary.Length != propertyNames.Length)
                throw new ApplicationException("The state Validator {0} for state {1} has {2} values insted of {3}"
                    .Formato(GetType().TypeName(), state, necessary.Length, propertyNames.Length));

            dictionary.Add(state, necessary);
        }

        public string Validate(E entity, PropertyInfo pi)
        {
            int index = propertyNames.IndexOf(pi.Name);
            if (index == -1)
                return null;

            S state = getState(entity);

            bool? necessary = dictionary[state][index];

            if (necessary == null)
                return null;

            object val = getters[index](entity);

            if (val is string && ((string)val).Length == 0)
                val = null;

            if (val != null && !necessary.Value)
                return Resources._0IsNotAllowedOnState1.Formato(propertyNiceNames[index], state);

            if (val == null&& necessary.Value)
                return Resources._0IsNecessaryOnState1.Formato(propertyNiceNames[index], state);

            return null; 
        }

        public IEnumerator GetEnumerator() //just to use object initializer
        {
            throw new NotImplementedException();
        }
    }

    public static class ValidationExtensions
    {
        public static bool Is<T>(this PropertyInfo pi, Expression<Func<T>> property)
        {
            PropertyInfo pi2 = ReflectionTools.BasePropertyInfo(property);
            return ReflectionTools.MemeberEquals(pi, pi2);
        }

        public static bool Is<S, T>(this PropertyInfo pi, Expression<Func<S, T>> property)
        {
            PropertyInfo pi2 = ReflectionTools.BasePropertyInfo(property);
            return ReflectionTools.MemeberEquals(pi, pi2);
        }
    }
}